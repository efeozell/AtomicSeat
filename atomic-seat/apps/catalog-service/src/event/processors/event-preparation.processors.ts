import { EventsService } from '../../modules/events/events.service';
import { BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { Events } from '../../modules/events/events.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Processor('event-preparation')
export class EventPreparationProcessor extends WorkerHost {
  private readonly logger = new Logger(EventPreparationProcessor.name);

  constructor(
    private readonly eventService: EventsService,
    @InjectRepository(Events)
    private readonly eventRepo: Repository<Events>,
  ) {
    super();

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('🚀 EVENT PREPARATION PROCESSOR BAŞLATILDI! 🚀');
    console.log('═══════════════════════════════════════════════');
    console.log('');

    this.logger.log('Processor hazır, job bekliyor...');
  }

  async process(job: Job<any, any, string>, token?: string): Promise<any> {
    this.logger.log(`🔄 Processing Job ${job.id} - Job Name: ${job.name}`);
    console.log(`📦 Job Data:`, JSON.stringify(job.data, null, 2));

    try {
      switch (job.name) {
        case 'prepare-seats':
          return await this.handleSeatPreparation(job);
        case 'test-job':
          return await this.handleTestJob(job);
        default:
          this.logger.warn(`⚠️ Bilinmeyen job: ${job.name}`);
          return { success: false, message: 'Unknown job type' };
      }
    } catch (error) {
      this.logger.error(`❌ Job ${job.id} processing failed:`, error);
      throw error; // BullMQ will handle retry logic
    }
  }

  private async handleSeatPreparation(job: Job) {
    this.logger.log(`🔄 Processing Job ${job.id} - Event: ${job.data.eventId}`);
    console.log('PREPATE-SEATS PROCCESSORE GIRDI MI?');

    const { eventId, venueId, pricing } = job.data;

    console.log(`${eventId} eventi icin koltuklar isleniyor`);

    try {
      await this.eventService.prepareEventSeats(eventId, venueId, pricing);
      this.logger.log(
        `✅ Job ${job.id} completed - Seats prepared for event ${eventId}`,
      );
      console.log(
        `Is yuku basariyla tamamlandi koltuklar arka planda islendi ${eventId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Job ${job.id} failed for event ${eventId}`,
        error.stack,
      );

      try {
        await this.eventRepo.delete({ id: eventId });
        console.error(
          `Koltuk hazirlama islemi basarisiz oldu ${eventId}: Basarisiz Event silindi`,
          error,
        );
      } catch (deleteError) {
        console.error('Kritik: Telafi işlemi de başarısız oldu!', deleteError);
      }

      throw new BadRequestException('Koltuk hazirlama islemi basarisiz oldu');
    }
  }

  private async handleTestJob(job: Job) {
    this.logger.log(`🔄 Processing Test Job ${job.id}`);
    console.log('TEST JOB PROCESSOR GİRDİ Mİ?');
  }
}
