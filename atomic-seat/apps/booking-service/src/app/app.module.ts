import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule, SharedModule } from '@atomic-seat/shared';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './booking/booking.entity';
import { BookingSeat } from './booking/booking-seat.entity';

@Module({
  imports: [
    DatabaseModule.forRoot('BOOKING_DB_NAME'),
    TypeOrmModule.forFeature([Booking, BookingSeat]),
    SharedModule,
    ClientsModule.register([
      {
        name: 'BOOKING_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: ['localhost:9092'],
            retry: {
              initialRetryTime: 300,
              retries: 10,
            },
          },
          consumer: {
            groupId: 'booking-producer-group',
          },
          producer: {
            allowAutoTopicCreation: true,
          },
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
