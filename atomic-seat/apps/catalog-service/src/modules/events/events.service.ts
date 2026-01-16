import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Events } from './events.entity';
import { Repository } from 'typeorm';
import { CreateEventDto } from '@atomic-seat/shared';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Events) private readonly eventRepo: Repository<Events>,
  ) {}
}
