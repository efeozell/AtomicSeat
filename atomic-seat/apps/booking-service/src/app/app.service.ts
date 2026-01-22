import {
  CreateBookingDto,
  MicroserviceClientService,
} from '@atomic-seat/shared';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingStatus } from './booking/booking.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly msClient: MicroserviceClientService,
    @Inject('BOOKING_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async createBooking(dto: CreateBookingDto) {
    console.log(`🔵 Booking olusturuluyor...`);

    const checkSeatsResult = await this.msClient.send(
      'catalog-service',
      {
        cmd: 'catalog-seats-check',
      },
      { seatIds: dto.seatIds },
    );
    console.log(
      `✅ Koltuklar müsait - Toplam: ${checkSeatsResult.totalPrice} TRY`,
    );

    //Koltuklar musait olduguna gore booking olusturuyoruz.

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const booking = this.bookingRepo.create({
      user_id: dto.userId,
      event_id: dto.eventId,
      seat_ids: dto.seatIds,
      seat_details: checkSeatsResult.seats.map((s) => ({
        seatId: s.id,
        price: s.price,
      })),
      total_price: checkSeatsResult.totalPrice,
      status: BookingStatus.PENDING,
      expires_at: expiresAt,
    });

    const savedBooking = await this.bookingRepo.save(booking);

    console.log(`✅ Booking oluşturuldu. ID: ${savedBooking.id}`);

    //Booking olusturulduktan sonra koltuklari rezerve etmesi icin catalog-service'deki reserve islemini tetikliyoruz.
    const reserveSeatsResult = await this.msClient.send(
      'catalog-service',
      {
        cmd: 'catalog-seats-reserve',
      },
      {
        seatIds: dto.seatIds,
        userId: dto.userId,
        bookingId: savedBooking.id,
        expiresAt: expiresAt,
      },
    );

    if (!reserveSeatsResult.success) {
      await this.bookingRepo.update(savedBooking.id, {
        status: BookingStatus.CANCELLED,
        cancelled_reason: reserveSeatsResult.error,
      });

      throw new BadRequestException(
        `Koltuklar rezerve edilirken bir hata: ${reserveSeatsResult.error}`,
      );
    }

    console.log(`✅ Koltuklar rezerve edildi: ${savedBooking.id}`);

    await this.kafkaClient.emit('booking-created', {
      bookingId: savedBooking.id,
      userId: dto.userId,
      eventId: dto.eventId,
      seatIds: dto.seatIds,
      totalPrice: checkSeatsResult.totalPrice,
      currency: 'TRY',
      expiresAt: expiresAt,
    });

    console.log(`📤 Kafka'ya gönderildi: booking.created`);

    return savedBooking;
  }
}
