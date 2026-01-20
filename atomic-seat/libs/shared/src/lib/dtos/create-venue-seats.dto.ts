import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

//Kuzey Kala Arkasi veya VIP Loca A ozelliklerini tanimlar
export class SectionConfigDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  rows!: number;

  @IsInt()
  seatsPerRow!: number;

  @IsEnum(['standard', 'vip', 'premium', 'box'])
  @IsOptional()
  seatType?: string;
}

//SectionConfigDto dizisini alip venue icin koltuklari olusturur
export class CreateVenueSeatsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionConfigDto)
  sections!: SectionConfigDto[];
}

export class CreateSingleSeatDto {
  @IsString()
  @IsNotEmpty()
  section!: string;

  @IsString()
  @IsNotEmpty()
  row!: string;

  @IsString()
  @IsNotEmpty()
  seatNumber!: string;

  @IsString()
  @IsOptional()
  seat_type?: string;

  @IsOptional()
  @IsString()
  coordinates?: string;
}
