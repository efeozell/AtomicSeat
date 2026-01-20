import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Events, EventType } from './events.entity';
import { DataSource, Repository } from 'typeorm';
import { CreateEventDto } from '@atomic-seat/shared';
import { EventSeat, EventSeatStatus } from './event-seat.entity';
import { VenueSeatTemplate } from '../venues/venue-seat-template.entity';
import { Venues } from '../venues/venues.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Events) private readonly eventRepo: Repository<Events>,
    @InjectRepository(EventSeat)
    private readonly eventSeatRepo: Repository<EventSeat>,
    @InjectRepository(VenueSeatTemplate)
    private readonly venueSeatRepo: Repository<VenueSeatTemplate>,
    @InjectRepository(Venues) private readonly venueRepo: Repository<Venues>,
    private readonly dataSource: DataSource,

    @InjectQueue('event-preparation')
    private readonly eventPrepareQueue: Queue,
  ) {
    console.log('✅ EventsService initialized with queue');
  }

  async testQueue() {
    const job = await this.eventPrepareQueue.add('test-job', {
      eventId: 'test-123',
      venueId: 'test-venue',
      pricing: { A: 100 },
    });

    return { message: 'Job eklendi', jobId: job.id };
  }

  async createEvent(dto: CreateEventDto): Promise<Events> {
    const venue = await this.venueRepo.findOne({ where: { id: dto.venue_id } });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    const eventIsExist = await this.eventRepo.findOne({
      where: { name: dto.name, description: dto.description },
    });

    if (eventIsExist) {
      throw new ConflictException(
        'Ayni isim ve aciklamaya sahip event zaten mevcut',
      );
    }

    const event = this.eventRepo.create({
      eventType: dto.type as EventType,
      name: dto.name,
      description: dto.description,
      start_date: dto.start_date,
      end_date: dto.end_date,
      capacity: venue.total_capacity,
      venue: venue,
      status: EventSeatStatus.PREPARING,
    });

    const savedEvent = await this.eventRepo.save(event);

    console.log(
      `Event basariyla olusturuldu  (Status: PREPARING) ${savedEvent.name}`,
    );

    //Arka planda koltuklari hazirlamasi icin bullQ kullanarak bir is kuyruge gonderiyoruz
    await this.eventPrepareQueue.add('prepare-seats', {
      eventId: savedEvent.id,
      venueId: savedEvent.venue_id,
      pricing: dto.pricing,
    });

    console.log(
      `Koltuklar hazirlanmasi icin is kuyruguna eklendi ${savedEvent.name}`,
    );

    return savedEvent;
  }

  //Koltuklari hazirlamak icin proccessor'de kullanailacak metodu burada yaziyoruz
  async prepareEventSeats(
    eventId: string,
    venueId: string,
    pricing: { [section: string]: number },
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log(`Koltuklar hazirlaniyor su event icin ${eventId}`);
      //Ilgili venue'nin koltuk template'lerini al
      const venueSeatTepmlates = await queryRunner.manager
        .getRepository(VenueSeatTemplate)
        .find({ where: { venue_id: venueId, is_active: true } });

      console.log(`Koltuk templatelerin bulundu ${venueSeatTepmlates.length}`);

      //EventSeat kayitlarini olustur - Her bir koltuk icin bir fiyat belirle
      const eventSeats: Partial<EventSeat>[] = venueSeatTepmlates.map(
        (template) => {
          const price = this.calculatePrice(template, pricing);
          return {
            event_id: eventId,
            venue_seat_template_id: template.id,
            price: price,
            status: EventSeatStatus.AVAILABLE,
          };
        },
      );

      await queryRunner.manager.getRepository(EventSeat).insert(eventSeats);

      console.log(`✅ ${eventSeats.length} koltuk transaction icine eklendi`);

      await queryRunner.manager.update(
        Events,
        { id: eventId },
        {
          total_seats: eventSeats.length,
          available_seats: eventSeats.length,
          status: 'published',
        },
      );

      await queryRunner.commitTransaction();

      console.log(
        `✅ Event ${eventId} id'li eventin tum koltuklari basariyla hazirlandi`,
      );
    } catch (error) {
      console.error(`❌ Hata oluştu, ROLLBACK yapılıyor... Event: ${eventId}`);
      await queryRunner.rollbackTransaction();

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(eventId: string): Promise<Events> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });

    if (!event) {
      throw new NotFoundException(
        'Event bulunamadi lutfen gecerli bir event id gonderiniz',
      );
    }

    return event;
  }

  async getEventSeats(eventId: string): Promise<EventSeat[]> {
    return this.eventSeatRepo.find({
      where: { event_id: eventId },
      relations: ['seat_template'],
      order: {
        seat_template: {
          section: 'ASC',
          row: 'ASC',
          seat_number: 'ASC',
        },
      },
    });
  }

  async getAvailableSeats(eventId: string): Promise<EventSeat[]> {
    return this.eventSeatRepo.find({
      where: { event_id: eventId, status: 'available' },
      relations: ['seat_template'],
      order: {
        seat_template: {
          section: 'ASC',
          row: 'ASC',
          seat_number: 'ASC',
        },
      },
    });
  }
  async getAllEvents(): Promise<Events[]> {
    return this.eventRepo.find({
      relations: ['venue'],
      order: {
        start_date: 'ASC',
      },
    });
  }

  private calculatePrice(
    template: VenueSeatTemplate,
    pricing: { [section: string]: number },
  ): number {
    const basePrice = pricing[template.section] || pricing['default'] || 100;

    //Koltuk tipine gore carpan
    const multipliers = {
      standard: 1,
      premium: 1.5,
      vip: 2,
      loca: 5,
    };

    const multiplier = multipliers[template.seat_type] || 1;

    return basePrice * multiplier;
  }
}
