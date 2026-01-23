import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingStatus } from './booking.entity';
import { LessThan, Repository } from 'typeorm';
import { AppService } from '../app.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class BookingsCron {
  private readonly logger = new Logger(BookingsCron.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly bookingService: AppService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredBookings() {
    const expiredBookings = await this.bookingRepo.find({
      where: {
        status: BookingStatus.PENDING,
        expires_at: LessThan(new Date()),
      },
    });

    if (expiredBookings.length === 0) return;

    this.logger.log(
      `🔍 ${expiredBookings.length} suresi dolmus rezervasyon (expired booking) bulundu`,
    );

    for (const booking of expiredBookings) {
      try {
        await this.bookingService.cancelBooking(
          booking.id,
          'Rezerbasyon suresi doldu',
        );
      } catch (error) {
        this.logger.error('❌ Expired booking iptal edilirken hata', error);
        throw new Error('Expired booking iptal edilirken hata');
      }
    }
  }
}
