import {
  CreateBookingDto,
  JwtAuthGuard,
  MicroserviceClientService,
} from '@atomic-seat/shared';
import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

@Controller('booking')
export class BookingServiceController {
  constructor(private readonly msClient: MicroserviceClientService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createBooking(@Body() dto: CreateBookingDto, @Req() req: Request) {
    const userId = req.user?.['userId'];

    if (!userId || typeof userId !== 'string') {
      throw new UnauthorizedException('Gecersiz token veya userId bulunamadi');
    }

    dto.userId = userId;

    console.log(`DTO.USERID ${dto.userId}`);

    return this.msClient.send(
      'booking-service',
      { cmd: 'create-booking' },
      dto,
    );
  }
}
