import { IsNumber, IsString, IsUUID } from 'class-validator';

export class UpdateVenuesDto {
  @IsUUID()
  id?: string;
  @IsString()
  name?: string;
  @IsString()
  address?: string;
  @IsString()
  city?: string;
  @IsNumber()
  capacity?: number;
}
