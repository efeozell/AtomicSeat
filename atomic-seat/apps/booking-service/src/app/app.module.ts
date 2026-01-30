import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule, SharedModule } from '@atomic-seat/shared';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './booking/booking.entity';
import { BookingSeat } from './booking/booking-seat.entity';
import { BookingsCron } from './booking/booking.cron';
import { ScheduleModule } from '@nestjs/schedule';
import { KafkaConsumerService } from './kafka/kafka-consumer.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule.forRoot('BOOKING_DB_NAME'),
    TypeOrmModule.forFeature([Booking, BookingSeat]),
    SharedModule,
  ],
  controllers: [AppController],
  providers: [AppService, BookingsCron, KafkaConsumerService],
})
export class AppModule {}
