import { Controller } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateBookingDto } from '@atomic-seat/shared';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern({ cmd: 'create-booking' })
  async createBooking(dto: CreateBookingDto) {
    return this.appService.createBooking(dto);
  }
}
