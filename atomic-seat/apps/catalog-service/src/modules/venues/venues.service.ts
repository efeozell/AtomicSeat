import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Venues } from './venues.entity';
import { Repository } from 'typeorm';
import { CreateVenuesDto, UpdateVenuesDto } from '@atomic-seat/shared';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venues) private readonly venuesRepo: Repository<Venues>,
  ) {}

  async createVenue(dto: CreateVenuesDto) {
    const newVenue = this.venuesRepo.create(dto);

    const result = await this.venuesRepo.save(newVenue);

    return result;
  }

  async updateVenue(dto: UpdateVenuesDto) {
    const result = await this.venuesRepo.update(dto.id, dto);

    return result;
  }

  async getVenueById(venueId: string) {
    const venue = await this.venuesRepo.findOne({ where: { id: venueId } });

    return venue;
  }

  async deleteVenue(venueId: string) {
    const result = await this.venuesRepo.update(venueId, {
      deleted_at: new Date(),
    });

    return result;
  }
}
