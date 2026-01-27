import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';
import { CreateUserDto, LoginUserDto } from '@atomic-seat/shared';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }

  @MessagePattern({ cmd: 'register' })
  async handleRegister(dto: CreateUserDto) {
    return this.appService.register(dto);
  }

  @MessagePattern({ cmd: 'login' })
  async handleLogin(dto: LoginUserDto) {
    return this.appService.login(dto);
  }

  @MessagePattern({ cmd: 'verify-2fa' })
  async handleVerifyTwoFactorAuth(data: { userId: string; code: string }) {
    return this.appService.loginWithTwoFactorAuth(data);
  }

  @MessagePattern({ cmd: 'enable-2fa' })
  async handleEnableTwoFactorAuth(userId: string) {
    return this.appService.enableTwoFactorAuth(userId);
  }

  @MessagePattern({ cmd: 'logout' })
  async handleLogout(refreshToken: string) {
    return this.appService.logout(refreshToken);
  }

  @MessagePattern({ cmd: 'refreshToken' })
  async refreshToken(token: string) {
    return this.appService.checkRefreshToken(token);
  }

  @MessagePattern({ cmd: 'get-user-by-id' })
  async getUserById(userId: string) {
    return this.appService.getUserById(userId);
  }
}
