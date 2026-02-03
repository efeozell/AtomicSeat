import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class NotificationPublisherService implements OnModuleInit {
  private readonly logger = new Logger(NotificationPublisherService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  async onModuleInit() {
    this.connection = await amqp.connect('amqp://localhost:5672');
    this.channel = await this.connection.createChannel();

    this.logger.log('✅ RabbitMQ Publisher baglandi');
  }
}
