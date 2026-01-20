import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

enum EventType {
  CONCERT = 'CONCERT',
  SPORTS = 'SPORTS',
  THEATER = 'THEATER',
  OPERA = 'OPERA',
  EDUCATIONAL = 'EDUCATIONAL',
}

export class CreateEventDto {
  @IsEnum(EventType)
  type!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  start_date!: Date;

  @IsString()
  end_date!: Date;

  @IsUUID()
  venue_id!: string;

  @IsEnum(['draft', 'published', 'cancelled', 'sold_out'])
  @IsOptional()
  status?: string;

  @IsObject()
  pricing!: {
    [section: string]: number; // { "A": 500, "B": 300, "VIP": 1000 }
  };
}
