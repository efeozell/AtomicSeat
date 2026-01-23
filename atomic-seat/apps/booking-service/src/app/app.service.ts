import {
  CreateBookingDto,
  MicroserviceClientService,
} from '@atomic-seat/shared';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingStatus } from './booking/booking.entity';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AppService {
  logger = new Logger(AppService.name);
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly msClient: MicroserviceClientService,
    @Inject('BOOKING_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async createBooking(dto: CreateBookingDto) {
    console.log(`🔵 Rezervasyon olusturuluyor...`);

    const bookingId = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    let reserveSeatsResult;
    try {
      reserveSeatsResult = await this.msClient.send(
        'catalog-service',
        {
          cmd: 'catalog-seats-reserve',
        },
        {
          seatIds: dto.seatIds,
          userId: dto.userId,
          bookingId: bookingId,
          expiresAt: expiresAt,
        },
      );
    } catch (error) {
      throw new BadRequestException(
        'Catalog serviceine erisilirken hata.',
        error,
      );
    }

    if (!reserveSeatsResult.success) {
      console.error(`Koltuklar dolu, booking olusturulamadi`);
      throw new BadRequestException(
        `Koltuklar musait degil: ${reserveSeatsResult.error}`,
      );
    }

    console.log(`✅ Koltuklar rezerve edildi, Booking DB'ye yazılıyor...`);

    try {
      const booking = this.bookingRepo.create({
        id: bookingId,
        user_id: dto.userId,
        event_id: dto.eventId,
        seat_ids: dto.seatIds,
        seat_details: reserveSeatsResult.seats.map((s) => ({
          seatId: s.id,
          price: s.price,
        })),
        total_price: reserveSeatsResult.totalPrice,
        status: BookingStatus.PENDING,
        expires_at: expiresAt,
      });

      const savedBooking = await this.bookingRepo.save(booking);

      console.log(`✅ Booking basariyla olusturuldu ${savedBooking}`);

      try {
        await this.kafkaClient.emit('booking-created', {
          bookingId: savedBooking.id,
          userId: dto.userId,
          eventId: dto.eventId,
          seatIds: dto.seatIds,
          totalPrice: reserveSeatsResult.totalPrice,
          currency: 'TRY',
          expiresAt: expiresAt,
        });
      } catch (error) {
        this.logger.error(
          `🚨 Booking eventi kafka'ya yayinirken hata: ${error}`,
        );
        console.log(`🚨 Booking eventi kafka'ya yayinirken hata: ${error}`);
      }

      return savedBooking;
    } catch (dbError) {
      console.error(`🚨 Database hatasi! Rezervasyon geri aliniyor`);

      this.msClient.send(
        'catalog-service',
        { cmd: 'catalog-seats-release' },
        {
          bookingId: bookingId,
        },
      );

      throw new BadRequestException('Rezervasyon olusturulurken hata.');
    }
  }

  async confirmBooking(bookingId: string, paymentId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new BadRequestException('Booking bulunamadi');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking onaylanamaz, durumu uygun degil');
    }

    try {
      await this.msClient.send(
        'catalog-service',
        { cmd: 'catalog-seats-confirm' },
        {
          seatIds: booking.seat_ids,
          userId: booking.user_id,
          bookingId: bookingId,
        },
      );
    } catch (error) {
      this.logger.error(`Catalog service confirm hatasi: ${error}`);
      throw new BadRequestException('Koltuk onaylama hatasi');
    }

    await this.bookingRepo.update(bookingId, {
      status: BookingStatus.CONFIRMED,
      payment_id: paymentId,
      paid_at: new Date(),
    });

    console.log(`✅ Booking onaylandi`);
  }

  async cancelBooking(bookingId: string, reason: string): Promise<void> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new BadRequestException('Booking bulunamadi');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking zaten iptal edilmis');
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      this.logger.warn(`Onaylanmis booking iptal ediliyor: ${bookingId}`);
    }

    await this.msClient.send(
      'catalog-service',
      {
        cmd: 'catalog-seats-release',
      },
      {
        seatIds: booking.seat_ids,
        bookingId: bookingId,
      },
    );

    await this.bookingRepo.update(bookingId, {
      status: BookingStatus.CANCELLED,
      cancelled_reason: reason,
      cancalled_at: new Date(),
    });

    console.log(`🚨 Booking Iptal edildi: ${bookingId} - ${reason}`);
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    return await this.bookingRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }
}
