import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
  @IsEmail()
  @IsNotEmpty({ message: 'Email gereklidir' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Sifre gereklidir' })
  password!: string;
}
