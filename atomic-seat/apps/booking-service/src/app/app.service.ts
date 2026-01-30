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

      let paymentSession;
      try {
        paymentSession = await this.msClient.send(
          'payment-service',
          {
            cmd: 'create-payment-session',
          },
          {
            bookingId: bookingId,
            userId: dto.userId,
            amount: reserveSeatsResult.totalPrice,
            currency: 'TRY',
            description: `Event biletleri - ${dto.seatIds.length} koltuk`,
            metadata: {
              eventId: savedBooking.event_id,
              seatCount: dto.seatIds.length,
            },
          },
        );
      } catch (paymentError) {
        this.logger.error(`Paymnet session hatasi: ${paymentError}`);
        throw new BadRequestException('Odeme oturumu olusturulamadi');
      }

      console.log(
        `✅ Payment session oluşturuldu: ${paymentSession.sessionId}`,
      );

      const remainingTime = Math.floor(
        (expiresAt.getTime() - Date.now()) / 1000,
      );

      return {
        bookingId: savedBooking.id,
        eventId: savedBooking.event_id,
        seatIds: savedBooking.seat_ids,
        totalPrice: Number(savedBooking.total_price),
        currency: savedBooking.currency,
        status: savedBooking.status,
        expiresAt: expiresAt.toISOString(),
        checkoutUrl: paymentSession.checkoutUrl,
        checkoutToken: paymentSession.token,

        message: 'Rezervasyon basarili. Lutfen 15 dakika icinde odeme yapin',
        remainingTime: remainingTime,
      };
    } catch (dbError) {
      console.error(`🚨 Database hatasi! Rezervasyon geri aliniyor`);

      try {
        await this.msClient.send(
          'catalog-service',
          { cmd: 'catalog-seats-release' },
          {
            seatIds: dto.seatIds,
            bookingId: bookingId,
          },
        );
        console.log('✅ Koltuklar serbest bırakıldı');
      } catch (releaseError) {
        console.error('❌ Koltuk serbest bırakma hatası:', releaseError);
      }

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

    if (booking.status === BookingStatus.CONFIRMED) {
      if (booking.payment_id === paymentId) {
        this.logger.warn(
          `♻️ Bu booking zaten bu odeme ID ile onaylanmis. Islem atlaniyor. ID: ${bookingId}`,
        );

        return {
          success: true,
          message: 'Booking zaten onaylandi (Idempotent)',
          bookingId: bookingId,
        };
      } else {
        //Booking onayli ancak farkli bir paymentId ile
        this.logger.error(
          `⚠️ Catisma: Booking onyali ama farkli payment ID Mevcut: ${booking.payment_id}, Gelen: ${paymentId}`,
        );
        throw new BadRequestException(
          'Booking zaten farkli bir payment islemi ile birlikte onaylanmis',
        );
      }
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Booking durumu uygun değil: ${booking.status}`,
      );
    }

    if (new Date() > booking.expires_at) {
      throw new Error(
        `Booking suresi dolmus: ${bookingId}` +
          `(expires: ${booking.expires_at})`,
      );
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
    //TODO: Email gonder.

    return {
      success: true,
      message: 'Booking onaylandi',
      bookingId: bookingId,
    };
  }

  async cancelBooking(bookingId: string, reason: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new BadRequestException('Booking bulunamadi');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      this.logger.warn(`Bu booking zaten iptal edilmiş: ${bookingId}`);
      return { success: true, message: 'Zaten iptal edilmiş' };
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      this.logger.warn(`Onaylanmis booking iptal ediliyor: ${bookingId}`);
      throw new BadRequestException('Tamamlanmis booking iptal edilemez');
    }

    //TODO: Burada ya telafi yaz ya da buradaki mantigi Event-Driven'a cevir
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

    return {
      success: true,
      message: 'Booking iptal edildi',
      bookingId: bookingId,
    };
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    return await this.bookingRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }
}
