import {
  CreateEventDto,
  CreateSingleSeatDto,
  CreateVenueDto,
  CreateVenueSeatsDto,
  JwtAuthGuard,
  MicroserviceClientService,
  Roles,
  RolesGuard,
  UserRole,
} from '@atomic-seat/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

@Controller('catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CataloServiceController {
  constructor(private readonly msClient: MicroserviceClientService) {}

  @Get('health')
  @Roles(UserRole.ADMIN)
  async healthCheckCatalogService() {
    return { status: 'ok' };
  }

  /**
   * VENUE ENDPOINTLERI
   */

  // Sadece ADMIN kullanıcılar mekan oluşturabilir
  @Post('venues/create')
  @Roles(UserRole.ADMIN)
  async createVenue(@Body() dto: CreateVenueDto) {
    try {
      const result = await this.msClient.send(
        'catalog-service',
        {
          cmd: 'create-venue',
        },
        dto,
      );

      return result;
    } catch (error) {
      console.log(`Venue olusturuken hata ${error}`);
      throw new BadRequestException('Mekan olusturuken hata olustu');
    }
  }

  @Post('venues/:id/seats/generate')
  @Roles(UserRole.ADMIN)
  async generateSeatsForVenue(
    @Param('id') venueId: string,
    @Body() dto: CreateVenueSeatsDto,
  ) {
    try {
      const result = await this.msClient.send(
        'catalog-service',
        {
          cmd: 'generate-seats',
        },
        { venueId, ...dto },
      );

      return result;
    } catch (error) {
      console.log(`Venue icin koltuk olusturulurken hata olustu ${error}`);
      throw new BadRequestException(`Koltuk olusturulurken hata olustu`);
    }
  }

  @Post('venues/:id/seats/add')
  @Roles(UserRole.ADMIN)
  async addSingleSeatToVenue(
    @Body() dto: CreateSingleSeatDto,
    @Param('id') venueId: string,
  ) {
    try {
      const result = await this.msClient.send(
        'catalog-service',
        {
          cmd: 'add-seat',
        },
        { venueId, dto },
      );

      return result;
    } catch (error) {
      console.log(`Single Venue eklenirken hata ${error} ${error.message}`);
      throw new BadRequestException('Single koltuk eklenirken hata olustu');
    }
  }

  //Ilgili mekaninin koltuklarini getir
  //TODO: Pagination ekle
  @Get('venues/:id/seats')
  async getSeatsByVenue(@Param('id') venueId: string) {
    try {
      const result = await this.msClient.send(
        'catalog-service',
        {
          cmd: 'get-seats-by-venue',
        },
        venueId,
      );

      return result;
    } catch (error) {
      console.log(
        `Venue'nin kotuk haritasi getirilirken hata ${error} Error Message: ${error.message}`,
      );
      throw new BadRequestException('Koltuk haritasi getirilirken hata olustu');
    }
  }

  @Get('venues/getallvenues')
  async getAllVenues() {
    try {
      const result = await this.msClient.send(
        'catalog-service',
        {
          cmd: 'find-all-venues',
        },
        {},
      );
      return result;
    } catch (error) {
      console.log(
        `Tum venueleri getirirken hata ${error} Error Message: ${error.message}`,
      );
      throw new BadRequestException('Tum venueler getirilirken hata olustu');
    }
  }

  @Get('venues/:id')
  async getVenueById(@Param('id') id: string) {
    try {
      const result = await this.msClient.send(
        'catalog-service',
        {
          cmd: 'find-one-venues',
        },
        id,
      );

      return result;
    } catch (error) {
      console.log(
        `Venue getirilirken hata ${error} Error Message: ${error.message}`,
      );
      throw new BadRequestException('Venue getirilirken hata olustu');
    }
  }

  @Post('venues/:id/remove')
  @Roles(UserRole.ADMIN)
  async removeVenue(@Param('id') id: string) {
    try {
      const result = await this.msClient.send(
        'catalog-service',
        { cmd: 'remove-venue' },
        id,
      );

      return result;
    } catch (error) {
      console.log(
        `Venue silinirken bir hata ${error} Error Message: ${error.message}`,
      );
      throw new BadRequestException('Venue silinirken hata olustu');
    }
  }

  /**
   * EVENT ENDPOINTLERI
   */

  @Post('events/test-queue')
  async testQueue() {
    const result = await this.msClient.send(
      'catalog-service',
      {
        cmd: 'test-queue',
      },
      {},
    );

    return result;
  }

  @Post('events/create')
  @Roles(UserRole.ADMIN)
  async createEvent(@Body() dto: CreateEventDto) {
    const result = await this.msClient.send(
      'catalog-service',
      { cmd: 'create-event' },
      dto,
    );

    return result;
  }

  @Get('events/:id')
  async getEventById(@Param('id') id: string) {
    try {
      const result = await this.msClient.send(
        'catalog-service',
        {
          cmd: 'find-one-event',
        },
        id,
      );

      return result;
    } catch (error) {
      console.log(
        `Eventi getirirken bir hata ${error} Error Message: ${error.message}`,
      );
      throw new BadRequestException('Event getirilirken hata olustu');
    }
  }

  @Get('events/:id/seats')
  async getSeatsByEvent(@Param('id') eventId: string) {
    try {
      const result = await this.msClient.send(
        'catalog-service',
        {
          cmd: 'get-seats-by-event',
        },
        eventId,
      );

      return result;
    } catch (error) {
      console.log(
        `Event'e ait koltuklar getirilirken hata ${error} Error Message: ${error.message}`,
      );
      throw new BadRequestException(
        'Event koltuklari getirilirken hata olustu',
      );
    }
  }

  @Get('events/:id/seats/available')
  async findAvailableSeats(@Param('id') eventId: string) {
    try {
      const result = await this.msClient.send(
        'catalog-service',
        { cmd: 'find-available-seats' },
        eventId,
      );

      return result;
    } catch (error) {
      console.log(
        `Evente ait musait koltuklar getirilirken hata ${error} Error Message: ${error.message}`,
      );

      throw new BadRequestException(
        'Event musait koltuklari getirilirken hata olustu',
      );
    }
  }

  @Get('events/all')
  async getAllEvents() {
    try {
      const result = await this.msClient.send(
        'catalog-service',
        { cmd: 'find-all-events' },
        null,
      );

      return result;
    } catch (error) {
      console.log(`Tum eventler getirilirken hata ${error} ${error.message}`);
      throw new BadRequestException('Tum eventler getirilirken hata olustu');
    }
  }
}
