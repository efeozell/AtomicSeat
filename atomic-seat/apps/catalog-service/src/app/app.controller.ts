import { BadRequestException, Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
  CreateEventDto,
  CreateSingleSeatDto,
  CreateVenueDto,
  CreateVenueSeatsDto,
} from '@atomic-seat/shared';
import { VenuesService } from '../modules/venues/venues.service';
import { EventsService } from '../modules/events/events.service';

@Controller()
export class AppController {
  constructor(
    private readonly venueService: VenuesService,
    private readonly eventService: EventsService,
  ) {}

  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }

  @MessagePattern({ cmd: 'health-check' })
  async healthCheckMessage() {
    return { status: 'ok' };
  }

  /**
   * VENUE SERVISLERI
   */

  @MessagePattern({ cmd: 'create-venue' })
  async createVenue(dto: CreateVenueDto) {
    try {
      return await this.venueService.createVenue(dto);
    } catch (error) {
      console.error(
        `catalog-service'de create venue hatasi: ${error} ${error.message}`,
      );
      throw new BadRequestException('Mekan olusturulurken hata olustu');
    }
  }

  @MessagePattern({ cmd: 'generate-seats' })
  async generateSeats(data: { venueId: string } & CreateVenueSeatsDto) {
    const { venueId, ...dto } = data;
    return this.venueService.generateSeatsForVenue(
      venueId,
      dto as CreateVenueSeatsDto,
    );
  }

  @MessagePattern({ cmd: 'add-seat' })
  async addSeat(data: { venueId: string; dto: CreateSingleSeatDto }) {
    return this.venueService.addSingleSeat(data.venueId, data.dto);
  }

  @MessagePattern({ cmd: 'get-seats-by-venue' })
  async getSeatsByVenue(venueId: string) {
    return this.venueService.getVenueSeats(venueId);
  }

  @MessagePattern({ cmd: 'find-all-venues' })
  async findAllVenues() {
    return this.venueService.findAll();
  }

  @MessagePattern({ cmd: 'find-one-venues' })
  async findOneVenue(id: string) {
    return this.venueService.findOne(id);
  }

  @MessagePattern({ cmd: 'remove-venue' })
  async removeVenue(id: string) {
    return this.venueService.remove(id);
  }

  /**
   * EVENT SERVISLERI
   */

  @MessagePattern({ cmd: 'test-queue' })
  async testQueue() {
    return this.eventService.testQueue();
  }

  @MessagePattern({ cmd: 'create-event' })
  async createEvent(dto: CreateEventDto) {
    return this.eventService.createEvent(dto);
  }

  @MessagePattern({ cmd: 'find-one-event' })
  async findOneEvent(id: string) {
    return this.eventService.findOne(id);
  }

  @MessagePattern({ cmd: 'get-seats-by-event' })
  async getSeatsByEvent(eventId: string) {
    return this.eventService.getEventSeats(eventId);
  }

  @MessagePattern({ cmd: 'find-available-seats' })
  async getAvailableSeats(eventId: string) {
    return this.eventService.getAvailableSeats(eventId);
  }

  @MessagePattern({ cmd: 'find-all-events' })
  async findAllEvents() {
    return this.eventService.getAllEvents();
  }
}
