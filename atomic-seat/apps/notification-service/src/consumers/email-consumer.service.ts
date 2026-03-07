import { MailService } from '@atomic-seat/shared';
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as amqp from 'amqplib';
import { NotificationLog } from '../notification/notification-log.entity';
import { Repository } from 'typeorm';

/**
 * EMAIL CONSUMER SERVICE
 *
 * gorevi email.queue'den gelen mesaji al ve email gonder
 *
 * retrt mekanizmasi:
 * basarisizi -> nack() -> queue geri gonder
 * 3 kez basarisiz -> dead letter queue'ye dus
 */
export class EmailConsumerService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(EmailConsumerService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  constructor(
    private readonly mailService: MailService,
    @InjectRepository(NotificationLog)
    private readonly notificationRepo: Repository<NotificationLog>,
  ) {}

  async onModuleInit() {
    await this.startConsuming();
  }

  private async startConsuming() {
    try {
      this.connection = await amqp.connect('amqp://localhost:5672');
      this.channel = await this.connection.createChannel();

      await this.channel.prefetch(5); //Ayni anda en fazla 5 mesaj isle

      this.logger.log('✅ Email Consumer basladi');

      await this.channel.consume(
        'email.queue',
        async (msg) => {
          if (msg) {
            this.logger.debug(
              `RabbitMQ'dan email.queue'dan msg verisi geliyor mu? ${msg}`,
            );
            await this.handleMessage(msg);
          }
        },
        { noAck: false },
      );

      this.logger.log('🎧 Email queue dinleniyor...');
    } catch (error) {
      this.logger.error('❌ Email Consumer baslarken hata: ', error);
      throw error;
    }
  }

  private async handleMessage(msg: amqp.Message) {
    try {
      const payload = JSON.parse(msg.content.toString());

      this.logger.debug(
        `handleMessage'e parametre olarak msg geliyor mu ve icerisinde event_type var mi? ${payload.eventType}`,
      );

      this.logger.log(
        `📩 EmailConsumerService: Mesaj alindi -  Type: ${payload.eventType}`,
      );

      //Retry count kontrolu
      const retryCount = this.getRetryCount(msg);

      if (retryCount >= 3) {
        this.logger.error(
          `🩻 Max Retry asildi - DLQ'ya gonderiliyor` +
            `BookingId: ${payload.data?.bookingId}`,
        );

        this.channel.nack(msg, false, false);

        return;
      }

      await this.sendEmail(payload);

      await this.notificationRepo.save({
        type: 'email',
        event_type: payload.eventType,
        recipient: payload.data.userEmail,
        payload: payload,
        status: 'sent',
        sent_at: new Date(),
      });

      this.channel.ack(msg);

      this.logger.log(
        `✅ Email gonderildi - ${payload.data.userEmail}` +
          `BookingId: ${payload.data?.bookingId}`,
      );
    } catch (error) {
      this.logger.error(`❌ Email gonderilirken hata: `, error.stack);

      if (this.isRetryableError(error)) {
        this.logger.warn(`🔄️ Gecici hata, mesaj queue'ye geri donuyor`);
        this.channel.nack(msg, false, true);
      } else {
        this.logger.error(`🩻 Kalici hata DLQ'ya gonderiliyor`);
        this.channel.nack(msg, false, false);
        //TODO: Cosnumer yazildi test edilecek hata varsa giderilecek
      }
    }
  }

  private async sendEmail(payload: any) {
    this.logger.debug(
      `Email gonderirken payload'in icerisinde bookingId var mi?: ${payload.data.bookingId}`,
    );

    switch (payload.eventType) {
      case 'booking.confirmed':
        await this.mailService.sendMail(
          payload.data.userEmail,
          `Rezervasyon Onaylandi ${payload.data.bookingId}`,
          `<p>Rezervasyonunuz basariyla olusturuldu biletlerim kismindan QR kodlari alabilirsiniz <b>${payload.data.seatDetails}</b></p>`,
        );
        break;
      case 'booking.cancelled':
        await this.mailService.sendMail(
          payload.data.userEmail,
          `Rezervasyon iptal edildi ${payload.data.bookingId}`,
          `<p>Rezervasyonunuz olusturulurken bir hata olustu lutfen tekrar kontrol ediniz. <b>${payload.data.seatDetails}</b></p>`,
        );
        break;

      default:
        this.logger.warn(`⚠️ Bilinmeyen event tipi: ${payload.eventType}`);
    }
  }

  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENOTFOUND',
      '421',
      '450',
    ];

    const errorMessage = error.message || '';
    return retryableErrors.some((err) => errorMessage.includes(err));
  }

  private getRetryCount(msg: amqp.Message): number {
    const xDeath = msg.properties.headers?.['x-death'];
    if (xDeath && Array.isArray(xDeath) && xDeath.length > 0) {
      return xDeath[0].count || 0;
    }
    return 0;
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
    this.logger.log(`🚨 Email Consumer kapatildi`);
  }
}
