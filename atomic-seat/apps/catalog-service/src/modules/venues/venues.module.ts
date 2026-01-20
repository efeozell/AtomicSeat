import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venues } from './venues.entity';
import { VenueSeatTemplate } from './venue-seat-template.entity';
import { VenuesService } from './venues.service';

@Module({
  imports: [TypeOrmModule.forFeature([Venues, VenueSeatTemplate])],
  controllers: [],
  providers: [VenuesService],
  exports: [VenuesService],
})
export class VenuesModule {}
