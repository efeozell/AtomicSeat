import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Venues } from './venues.entity';
import { Repository } from 'typeorm';
import {
  CreateSingleSeatDto,
  CreateVenueDto,
  CreateVenueSeatsDto,
  UpdateVenuesDto,
} from '@atomic-seat/shared';
import { VenueSeatTemplate } from './venue-seat-template.entity';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venues) private readonly venuesRepo: Repository<Venues>,
    @InjectRepository(VenueSeatTemplate)
    private readonly venueSeatTemplateRepo: Repository<VenueSeatTemplate>,
  ) {}

  //1️⃣ Venue Olusturma - Mekan olusturma
  async createVenue(dto: CreateVenueDto): Promise<Venues> {
    const newVenue = this.venuesRepo.create(dto);
    return await this.venuesRepo.save(newVenue);
  }

  //2️⃣ Toplu fiziksel mekan koltugu toplu olusturuma (Otomatik bir blok olusturma)
  async generateSeatsForVenue(
    venueId: string,
    dto: CreateVenueSeatsDto,
  ): Promise<{ created: number; seats: VenueSeatTemplate[] }> {
    const venue = await this.venuesRepo.findOne({ where: { id: venueId } });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    const seatsToCreate: Partial<VenueSeatTemplate>[] = [];

    for (const section of dto.sections) {
      for (let rowNum = 1; rowNum <= section.rows; rowNum++) {
        for (let seatNum = 1; seatNum <= section.seatsPerRow; seatNum++) {
          seatsToCreate.push({
            venue_id: venueId,
            section: section.name,
            row: rowNum.toString(),
            seat_number: seatNum.toString(),
            seat_type: section.seatType || 'standard',
            is_active: true,
          });
        }
      }
    }

    console.log(
      `Olusturuluyor ${seatsToCreate.length} koltuk var su mekan icin ${venue.name}`,
    );

    await this.venuesRepo.manager.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .insert()
        .into(VenueSeatTemplate)
        .values(seatsToCreate)
        .execute();

      await manager.increment(
        Venues,
        { id: venueId },
        'total_capacity',
        seatsToCreate.length,
      );
    });

    console.log(`✅ ${seatsToCreate.length} koltuk basariyla olusturuldu`);

    const createdSeat = await this.venueSeatTemplateRepo.find({
      where: { venue_id: venueId },
    });

    return {
      created: seatsToCreate.length,
      seats: createdSeat,
    };
  }

  async addSingleSeat(
    venueId: string,
    dto: CreateSingleSeatDto,
  ): Promise<VenueSeatTemplate> {
    try {
      const venue = await this.venuesRepo.findOne({ where: { id: venueId } });
      if (!venue) {
        throw new NotFoundException('Venue not found');
      }

      const existingSeat = await this.venueSeatTemplateRepo.findOne({
        where: {
          venue_id: venueId,
          section: dto.section,
          row: dto.row,
          seat_number: dto.seatNumber,
        },
      });

      if (existingSeat) {
        throw new BadRequestException('Seat already exists');
      }

      const newSeat = this.venueSeatTemplateRepo.create({
        venue_id: venueId,
        section: dto.section,
        row: dto.row,
        seat_number: dto.seatNumber,
        seat_type: dto.seat_type || 'standard',
      });

      const savedSeat = await this.venueSeatTemplateRepo.save(newSeat);

      //Venue'nin toplam kapasitesini guncelliyoruz
      await this.venuesRepo.increment({ id: venueId }, 'total_capacity', 1);

      return savedSeat;
    } catch (error) {
      console.log(`venues.service.ts findOne hata: ${error} ${error.message}`);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Koltuk eklenirken hata olustu');
    }
  }

  async getVenueSeats(venueId: string): Promise<VenueSeatTemplate[]> {
    try {
      return await this.venueSeatTemplateRepo.find({
        where: { venue_id: venueId },
        order: {
          section: 'ASC',
          row: 'ASC',
          seat_number: 'ASC',
        },
      });
    } catch (error) {
      console.log(`venues.service.ts findOne hata: ${error} ${error.message}`);
      throw new BadRequestException(
        'Mekan koltuklari getirilirken hata olustu',
      );
    }
  }

  async findOne(id: string): Promise<Venues> {
    try {
      const venue = await this.venuesRepo.findOne({
        where: { id },
        relations: ['seat_templates'],
      });

      if (!venue) {
        throw new NotFoundException('Venue not found');
      }

      return venue;
    } catch (error) {
      console.log(`venues.service.ts findOne hata: ${error} ${error.message}`);
      throw new BadRequestException('Mekan getirilirken hata olustu');
    }
  }

  async findAll(): Promise<Venues[]> {
    try {
      return await this.venuesRepo.find({
        where: { is_active: true, deleted_at: null },
      });
    } catch (error) {
      console.log(`venues.service.ts findAll hata: ${error} ${error.message}`);
      throw new BadRequestException('Mekanlar getirilirken hata olustu');
    }
  }

  async remove(id: string) {
    try {
      const venue = await this.venuesRepo.findOne({ where: { id } });

      if (!venue) {
        throw new NotFoundException('Venue not found');
      }

      await this.venuesRepo.update(id, {
        is_active: false,
        deleted_at: new Date(),
      });

      return { message: 'Venue removed successfully' };
    } catch (error) {
      // Preserve HTTP exceptions (NotFoundException, HttpException, etc.)
      if (
        error instanceof NotFoundException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      // Only wrap non-HTTP errors in BadRequestException
      console.log(`venues.service.ts remove hata: ${error.message}`);
      throw new BadRequestException(
        `Mekan silinirken hata olustu: ${error.message || 'Unknown error'}`,
      );
    }
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
