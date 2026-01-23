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

  @MessagePattern({ cmd: 'confirm-booking' })
  async confirmBooking(data: { bookingId: string; paymentId: string }) {
    return this.appService.confirmBooking(data.bookingId, data.paymentId);
  }

  @MessagePattern({ cmd: 'cancel-booking' })
  async cancelBooking(data: { bookingId: string; reason: string }) {
    return this.appService.cancelBooking(data.bookingId, data.reason);
  }

  @MessagePattern({ cmd: 'get-user-bookings' })
  async getUserBookings(userId: string) {
    return this.appService.getUserBookings(userId);
  }
}
