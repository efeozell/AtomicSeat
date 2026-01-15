import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty({ message: 'Sifre gereklidir' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Kullanici adi gereklidir' })
  username!: string;

  @IsString()
  @IsNotEmpty({ message: 'Isim gereklidir' })
  name!: string;
}
