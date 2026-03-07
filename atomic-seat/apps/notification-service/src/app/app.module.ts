import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule, SharedModule } from '@atomic-seat/shared';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationLog } from '../notification/notification-log.entity';
import { RabbitMQConfig } from '../config/rabbitmq.config';
import { EmailConsumerService } from '../consumers/email-consumer.service';

@Module({
  imports: [
    DatabaseModule.forRoot('NOTIFICATION_DB_NAME'),
    TypeOrmModule.forFeature([NotificationLog]),
    SharedModule,
  ],
  controllers: [AppController],
  providers: [AppService, RabbitMQConfig, EmailConsumerService],
})
export class AppModule {}
