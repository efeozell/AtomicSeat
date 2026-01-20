import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Events } from './events.entity';
import { EventSeat } from './event-seat.entity';
import { VenueSeatTemplate } from '../venues/venue-seat-template.entity';
import { Venues } from '../venues/venues.entity';
import { EventsService } from './events.service';
import { EventPreparationProcessor } from '../../event/processors/event-preparation.processors';
import { EventsController } from './events.controller';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    TypeOrmModule.forFeature([Events, EventSeat, VenueSeatTemplate, Venues]),
    BullModule.registerQueue({
      name: 'event-preparation',
    }),
  ],
  controllers: [EventsController],
  providers: [EventsService, EventPreparationProcessor],
  exports: [EventsService],
})
export class EventsModule {}
