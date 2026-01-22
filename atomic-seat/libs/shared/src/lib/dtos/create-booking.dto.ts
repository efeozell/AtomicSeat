import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsNotEmpty()
  @IsString()
  eventId!: string;

  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  seatIds!: string[];
}
