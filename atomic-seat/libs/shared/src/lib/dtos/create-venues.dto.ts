import { IsNumber, IsString } from 'class-validator';

export class CreateVenuesDto {
  @IsString()
  name!: string;

  @IsString()
  address!: string;

  @IsString()
  city!: string;

  @IsNumber()
  capacity!: number;
}
