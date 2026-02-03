import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '@atomic-seat/shared';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationLog } from '../notification/notification-log.entity';
import { RabbitMQConfig } from '../config/rabbitmq.config';

@Module({
  imports: [
    DatabaseModule.forRoot('NOTIFICATION_DB_NAME'),
    TypeOrmModule.forFeature([NotificationLog]),
  ],
  controllers: [AppController],
  providers: [AppService, RabbitMQConfig],
})
export class AppModule {}
