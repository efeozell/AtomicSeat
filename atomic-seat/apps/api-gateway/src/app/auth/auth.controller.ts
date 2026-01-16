import {
  CreateUserDto,
  JwtAuthGuard,
  LoginUserDto,
  MicroserviceClientService,
} from '@atomic-seat/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly msClient: MicroserviceClientService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async registerUser(@Body() dto: CreateUserDto) {
    const result = await this.msClient.send(
      'auth-service',
      { cmd: 'register' },
      dto,
    );

    return result;
  }

  @Post('login')
  async loginUser(
    @Body() dto: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const result = await this.msClient.send(
        'auth-service',
        { cmd: 'login' },
        dto,
      );

      if (result.statusCode === 206 || result.require2FA) {
        return {
          statusCode: 206,
          message: result.message,
          userId: result.userId,
        };
      }

      if (!result.accessToken || !result.refreshToken) {
        throw new BadRequestException('Giris yapilirken hata olustu');
      }

      response.cookie('Authentication', result.accessToken, {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 dakika
      });

      response.cookie('Refresh', result.refreshToken, {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
      });

      return {
        message: 'Giris basarilir',
        user: result.user,
      };
    } catch (error) {
      console.error('GIRIS YAPARKEN HATA: ', error);
      throw new BadRequestException('Giris yapilirken hata olustu');
    }
  }

  @Post('login-2fa')
  async loginUser2Fa(
    @Body() dto: { userId: string; code: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const result = await this.msClient.send(
        'auth-service',
        { cmd: 'verify-2fa' },
        dto,
      );

      response.cookie('Authentication', result.accessToken, {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 dakika
      });

      response.cookie('Refresh', result.refreshToken, {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
      });

      return result.user;
    } catch (error) {
      console.log(`2FA ile giris yaparken hata ${error}`);
      throw new BadRequestException('2FA ile giris yaparken hata olustu');
    }
  }

  @Patch('enable-2fa')
  @UseGuards(JwtAuthGuard)
  async enableTwoFactorAuth(@Req() request: Request) {
    try {
      const userId = request.user['userId'];

      const result = await this.msClient.send(
        'auth-service',
        { cmd: 'enable-2fa' },
        userId,
      );

      return result;
    } catch (error) {
      console.log(`2FA Servis aktif edilirken hata! ${error}`);
      throw new BadRequestException('2FA Servis aktif edilirken hata!');
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logoutUser(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('Authentication');
    response.clearCookie('Refresh');
    return { message: 'Cikis basarili' };
  }

  @Post('refresh')
  async refreshToken(
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ) {
    try {
      const token = request.cookies['Refresh'];
      if (!token) {
        throw new BadRequestException('Refresh token bulunamadi');
      }

      const result = await this.msClient.send(
        'auth-service',
        { cmd: 'refreshToken' },
        token,
      );

      response.cookie('Authentication', result.accessToken, {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 dakika
      });

      response.cookie('Refresh', result.refreshToken, {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
      });

      return {
        statusCode: 200,
        message: 'Token yenileme basarili',
      };
    } catch (error) {
      console.log(
        `RefreshToken uretilirken hata path: /api-gateway/auth/auth.controller ${error}`,
      );
      throw new BadRequestException('Token yenilenirken hata olustu');
    }
  }

  //TODO: auth.service.ts dosyainda kullanici olusturulduktan sonra rabbitMQ'ya emit atilacak. Daha sonra bunu dinleyen
  //diger servisler kendi db'lerinde birer kopya olusturucak.
}
