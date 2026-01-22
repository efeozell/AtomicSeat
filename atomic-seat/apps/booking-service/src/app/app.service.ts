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
}
