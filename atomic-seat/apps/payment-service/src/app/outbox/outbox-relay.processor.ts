import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Kafka, Producer } from 'kafkajs';
import { OutboxEvent, OutboxStatus } from './outbox.entity';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { timestamp } from 'rxjs';

@Injectable()
export class OutboxRelayProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayProcessor.name);

  private producer: Producer;
  private kafka: Kafka;

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
  ) {
    this.kafka = new Kafka({
      clientId: 'payment-service-outbox-relay',
      brokers: ['localhost:9092'],
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      transactionalId: 'payment-outbox-producer',
    });
  }

  //Module baslagidina kafkaya baglan
  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('✅ Kafka producer connected.');
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async relayOutboxEvents() {
    const pendingEvents = await this.outboxRepo.find({
      where: { status: OutboxStatus.PENDING },
      order: { created_at: 'ASC' },
      take: 100,
    });

    if (pendingEvents.length === 0) return;

    this.logger.log(`📨 ${pendingEvents.length} outbox event işlenecek...`);

    //Her bir eventi for dongusu ile birlikte kafkaya gonder
    for (const event of pendingEvents) {
      await this.relayEvent(event);
    }
  }

  private async relayEvent(event: OutboxEvent): Promise<void> {
    try {
      const topic = this.getTopicName(event.event_type);

      this.logger.log(
        `📤 Event kafka'ya gonderiliyor: ${event.id} -> ${topic}`,
      );

      await this.producer.send({
        topic: topic,
        messages: [
          {
            key: event.payload.bookingId,
            value: JSON.stringify({
              eventId: event.id,
              eventType: event.event_type,
              aggregateId: event.aggregate_id,
              payload: event.payload,
              timestamp: event.created_at.toISOString(),
            }),
            headers: {
              'event-type': event.event_type,
              'aggregate-type': event.aggregate_type,
              'soruce-service': 'payment-service',
            },
          },
        ],
      });

      await this.outboxRepo.update(event.id, {
        status: OutboxStatus.PUBLISHED,
        published_at: new Date(),
      });

      this.logger.log(
        `✅ Event başarıyla kafkaya publish edildi, gönderildi: ${event.id}`,
      );
    } catch (error) {
      this.logger.error(`❌ Kafka publish hatasi: ${event.id}`, error.stack);

      const newRetryCount = event.retry_count + 1;

      if (newRetryCount >= event.max_retries) {
        //Maks deneme asildi => FAILED yap

        await this.outboxRepo.update(event.id, {
          status: OutboxStatus.FAILED,
          retry_count: newRetryCount,
          error_message: error.message,
        });

        this.logger.error(`🩻 Event Max Retry asildi: ${event.id}`);

        //TODO: Alert gonder
      } else {
        //Retry hakki var - PENDING'de birak

        await this.outboxRepo.update(event.id, {
          retry_count: newRetryCount,
          error_message: error.message,
        });

        this.logger.warn(
          `🔄️ Event retry edilecek (${newRetryCount}/${event.max_retries}): ${event.id}`,
        );
      }
    }
  }

  private getTopicName(eventType: string): string {
    const topicMap = {
      'payment.completed': 'payment.events.completed',
      'payment.failed': 'payment.events.failed',
    };

    return topicMap[eventType] || 'payment.events.unknown';
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    this.logger.log('🔌 Kafka Producer bağlantısı kapatıldı');
  }
}
