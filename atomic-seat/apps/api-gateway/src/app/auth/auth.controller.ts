import { CreateUserDto, MicroserviceClientService } from '@atomic-seat/shared';
import { Body, Controller, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly msClient: MicroserviceClientService) {}

  @Post('register')
  async registerUser(@Body() dto: CreateUserDto) {
    const result = await this.msClient.send(
      'auth-service',
      { cmd: 'register' },
      dto,
    );

    return result;
  }

  //TODO: Kullanici login sistemi eklenecek cookielere token donulecek.
}
