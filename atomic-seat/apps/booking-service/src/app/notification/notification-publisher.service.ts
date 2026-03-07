import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class NotificationPublisherService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationPublisherService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  async onModuleInit() {
    this.connection = await amqp.connect('amqp://localhost:5672');
    this.channel = await this.connection.createChannel();

    this.logger.log('✅ RabbitMQ Publisher baglandi');
  }

  async publishBookingConfirmed(data: {
    bookingId: string;
    userId: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    eventType: string;
    eventName: string;
    seatDetails: any[];
    totalPrice: number;
  }) {
    const payload = {
      eventType: 'booking.confirmed',
      timestamp: new Date().toISOString(),
      data: {
        bookingId: data.bookingId,
        userId: data.userId,
        userEmail: data.userEmail,
        userPhone: data.userPhone,
        userName: data.userName,
        eventType: data.eventType,
        eventName: data.eventName,
        seatDetails: data.seatDetails,
        totalPrice: data.totalPrice,
      },
    };

    try {
      await this.channel.publish(
        'notifications.topic',
        'booking.confirmed.email',
        Buffer.from(JSON.stringify(payload)),
        {
          persistent: true,
          priority: 5,
          contentType: 'application/json',
          headers: {
            'x-notification-type': 'email',
            'x-source-service': 'booking-service',
          },
        },
      );

      this.logger.log(
        `✉️ Email notification published - Booking: ${data.bookingId}`,
      );

      if (data.userPhone) {
        await this.channel.publish(
          'notifications.topic',
          'booking.confirmed.sms',
          Buffer.from(JSON.stringify(payload)),
          {
            persistent: true,
            priority: 7,
          },
        );

        this.logger.log(
          `📱 SMS notification published - Booking: ${data.bookingId}`,
        );
      }

      await this.channel.publish(
        'notifications.topic',
        'booking.confirmed.push',
        Buffer.from(JSON.stringify(payload)),
        {
          persistent: true,
        },
      );

      this.logger.log(
        `🔔 Push notification published - Booking: ${data.bookingId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Notification publish edilirken bir hata yasandi ${data.bookingId}`,
        error.stack,
      );
      throw error;
    }
  }

  async publishBookingCancelled(data: {
    bookingId: string;
    userId: string;
    userEmail: string;
    eventName: string;
    reason: string;
  }) {
    const payload = {
      eventType: 'booking.cancelled',
      timestamp: new Date().toISOString(),
      data: data,
    };

    try {
      await this.channel.publish(
        'notifications.topic',
        'booking.cancelled.email',
        Buffer.from(JSON.stringify(payload)),
        { persistent: true },
      );

      this.logger.log(
        `✉️ Cancellation email published - Booking: ${data.bookingId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Cancellation notification hatasi - Booking: ${data.bookingId}`,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}
