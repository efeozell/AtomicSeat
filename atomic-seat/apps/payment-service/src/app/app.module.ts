import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule, SharedModule } from '@atomic-seat/shared';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment/payment.entity';
import { ConfigModule } from '@nestjs/config';
import { OutboxEvent } from './outbox/outbox.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxRelayProcessor } from './outbox/outbox-relay.processor';

@Module({
  imports: [
    DatabaseModule.forRoot('PAYMENT_DB_NAME'),
    TypeOrmModule.forFeature([Payment, OutboxEvent]),
    ScheduleModule.forRoot(),
    SharedModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, OutboxRelayProcessor],
})
export class AppModule {}
