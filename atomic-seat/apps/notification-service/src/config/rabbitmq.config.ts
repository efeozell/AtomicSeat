import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQConfig implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQConfig.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  async onModuleInit() {
    await this.setupRabbitMQ();
  }

  private async setupRabbitMQ() {
    try {
      this.connection = await amqp.connect('amqp://localhost:5672');
      this.channel = await this.connection.createChannel();

      this.logger.log('✅ RabbitMQ baglantisi kuruldu');

      //Exchange Oluştur - Santrali kur
      await this.channel.assertExchange('dlx.notification', 'topic', {
        durable: true,
      });

      // Queue Oluştur - Posta kutularını koy
      await this.channel.assertQueue('dlq.notification', {
        durable: true,
        messageTtl: 7 * 24 * 60 * 60 * 1000,
      });

      // Bind Queue to Exchange - Posta kutularını santrale bağla
      await this.channel.bindQueue('dlq.notification', 'dlx.notification', '#');

      //Ana topic exchange olustur Tum notification mesajlari buraya gelecek
      await this.channel.assertExchange('notifications.topic', 'topic', {
        durable: true,
      });

      //TODO: Email queue olusturucaz. Notification mesajlari alip route edicek exchange'i zaten yazdik

      await this.channel.assertQueue('email.queue', {
        durable: true,
        deadLetterExchange: 'dlx.notification',
        deadLetterRoutingKey: 'dlq.email',
        arguments: {
          'x-max-priority': 10,
        },
      });

      //Email queue'yu exchange'e bagla
      await this.channel.bindQueue(
        'email.queue',
        'notifications.topic',
        '*.*.email',
      );

      //Sms queue olustur
      await this.channel.assertQueue('sms.queue', {
        durable: true,
        deadLetterExchange: 'dlx.notification',
        deadLetterRoutingKey: 'dlq.sms',
      });

      //Sms queue'yu exchange'e bagla

      await this.channel.bindQueue(
        'sms.queue',
        'notifications.topic',
        '*.*.sms',
      );

      //Push queue olustur
      await this.channel.assertQueue('push.queue', {
        durable: true,
        deadLetterExchange: 'dlx.notification',
        deadLetterRoutingKey: 'dlq.push',
      });

      //Push queue'yu exchange'e bagla

      await this.channel.bindQueue(
        'push.queue',
        'notifications.topic',
        '*.*.push',
      );

      await this.channel.assertQueue('audit.queue', { durable: true });

      await this.channel.bindQueue('audit.queue', 'notifications.topic', '#');

      this.logger.log('✅ RabbitMQ yapilandirmasi tamamlandi');
    } catch (error) {
      this.logger.error('❌ RabbitMQ yapilandirmasi basarisiz oldu', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
    this.logger.log('RabbitMQ baglantisi kapatildi');
  }
}
