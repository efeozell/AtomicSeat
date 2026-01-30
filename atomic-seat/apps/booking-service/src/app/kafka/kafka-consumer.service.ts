import {
  forwardRef,
  Inject,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Consumer, EachMessagePayload, Kafka } from 'kafkajs';
import { AppService } from '../app.service';

export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);

  private consumer: Consumer;
  private kafka: Kafka;
  constructor(
    @Inject(forwardRef(() => AppService))
    private readonly bookingService: AppService,
  ) {
    this.kafka = new Kafka({
      clientId: 'booking-service',
      brokers: ['localhost:9092'],
    });

    this.consumer = this.kafka.consumer({
      groupId: 'booking-service-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  //Module basladiginda kafkaya baglan ve dinlemeye basla
  async onModuleInit() {
    await this.consumer.connect();
    this.logger.log('✅ Kafka consumer baglandi.');

    await this.consumer.subscribe({
      topics: ['payment.events.completed', 'payment.events.failed'],
      fromBeginning: false,
    });

    this.logger.log('📋 Kafka topiclerine abone olundu.');

    //Posta kutusunu kontrol etmek
    //Kafka Broketine gider -> Benim icin bir yeni mesaj var mi? Polling -> Eger mesaj varsa KafkaJS kutuphanesi alir ve buraya getirir. (Mesaj isledikten sonra tekrar 1. adima doner)
    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });

    this.logger.log('🎧 Kafka consumer dinlenmeye basladi...');
  }

  //Gelen mesaji islemek icin
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      const event = JSON.parse(message.value.toString());

      this.logger.log(
        `📥 Mesaj alindi - Topic ${topic}, Partition: ${partition}, Offset: ${message.offset}`,
      );
      this.logger.debug(`Event: ${JSON.stringify(event)}`);

      switch (topic) {
        case 'payment.events.completed':
          //Odeme basarili booking onayla
          await this.handlePaymentCompleted(event);
          break;

        case 'payment.events.failed':
          //Odeme basarisiz booking iptal et
          await this.handlePaymentFailed(event);
          break;

        default:
          this.logger.warn(`⚠️ Bilinmeyen topic: ${topic}`);
      }

      this.logger.log(`✅ Mesaj isleme tamamlandi - Offset: ${message.offset}`);
    } catch (error) {
      this.logger.error(
        `❌ Mesaj isleme hatasi - Topic: ${topic}, Offset: ${message.offset}`,
        error.stack,
      );

      throw error;
    }
  }

  private async handlePaymentCompleted(event: any): Promise<void> {
    const { bookingId, paymentId } = event.payload;

    this.logger.log(`💳 Payment Completed isleniyor - Booking ${bookingId}`);

    //Booking service'e yonlendir
    await this.bookingService.confirmBooking(bookingId, paymentId);

    this.logger.log(`✅ Booking onaylandi - Booking ${bookingId}`);
  }

  private async handlePaymentFailed(event: any): Promise<void> {
    const { bookingId, errorMessage } = event.payload;

    this.logger.log(`❌ Payment failed isleniyor - Booking ${bookingId}`);

    await this.bookingService.cancelBooking(
      bookingId,
      `Ödeme Başarısız: ${errorMessage}`,
    );

    this.logger.log(`🔓 Booking cancelled: ${bookingId}`);
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    this.logger.log('🛑 Kafka consumer bağlantısı kapatıldı.');
  }
}
