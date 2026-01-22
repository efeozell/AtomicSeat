import {
  AuthCreatedEvent,
  CreateUserDto,
  LoginUserDto,
  MailService,
} from '@atomic-seat/shared';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../modules/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AppService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async register(dto: CreateUserDto) {
    try {
      const user = await this.userService.createUser(dto);

      const event = new AuthCreatedEvent(
        user.id,
        user.email,
        user.name,
        user.username,
        user.role,
        user.createdAt,
      );

      return {
        statusCode: 201,
        message: 'Kullanici basariyla olusturuldu',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.username,
          },
        },
      };
    } catch (error) {
      console.log(`Error register in auth.service ${error}, ${error.message}`);
      throw new InternalServerErrorException('Kullanici olusturulurken hata');
    }
  }

  async login(dto: LoginUserDto) {
    try {
      const user = await this.userService.findyByEmailWithPassword(dto.email);

      if (!user) {
        throw new BadRequestException('Gecersiz email veya sifre');
      }

      const dummyHash = this.configService.get<string>('DUMMY_HASH');
      const targetPassword = user?.password || dummyHash;

      const isPasswordValid = await bcrypt.compare(
        dto.password,
        targetPassword,
      );

      if (!isPasswordValid) {
        throw new BadRequestException('Gecersiz email veya sifre');
      }

      if (user.isTwoFactorAuthEnabled) {
        const code = await this.generateTwoFactorAuthCode({
          userId: user.id,
        });

        try {
          await this.mailService.sendMail(
            user.email,
            'Iki Faktorlu Dogrulama Kodu',
            `<p>Dogrulama kodunuz: <b>${code}</b></p>`,
          );
        } catch (error) {
          console.log(`Login'de dogrulama kodu gonderilirken hata olustu`);
          throw new InternalServerErrorException(
            'Dogrulama kodu gonderilirken hata olustu',
          );
        }

        return {
          statusCode: 206,
          message:
            'Iki faktorlu dogrulama kodu gonderildi lutfen mail kutunuzu kontrol edin',
          userId: user.id,
          require2FA: true,
        };
      }

      const accessToken = this.generateAccessToken(
        user.id,
        user.email,
        user.role,
      );

      const refreshToken = await this.generateRefreshToken(user.id);

      const { password, ...result } = user;

      return {
        accessToken,
        refreshToken,
        user: result,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Giriş işlemi sırasında beklenmedik bir hata oluştu.',
      );
    }
  }

  async loginWithTwoFactorAuth(data: { userId: string; code: string }) {
    try {
      const isCodeValid = await this.checkTwoFactorAuthCode({
        userId: data.userId,
        code: data.code,
      });

      if (!isCodeValid) {
        throw new BadRequestException('Gecersiz dogrulama kodu');
      }

      await this.generateTwoFactorAuthCode({ userId: data.userId });

      const user = await this.userService.findById(data.userId);

      if (!user) {
        throw new InternalServerErrorException('Kullanici bulunamadi');
      }

      const accessToken = this.generateAccessToken(
        user.id,
        user.email,
        user.role,
      );

      const refreshToken = await this.generateRefreshToken(user.id);

      return {
        accessToken,
        refreshToken,
        user,
      };
    } catch (error) {
      console.log(`2FA Kod ile giris yaparken hata ${error}`);
      throw new BadRequestException(
        'Iki faktorlu dogrulama ile giris yapilirken hata',
      );
    }
  }

  async logout(refreshToken: string) {
    try {
      await this.redis.del(`refresh_token:${refreshToken}`);
      return { message: 'Basariyla cikis yapildi' };
    } catch (error) {
      console.log(`Cikis yapilirken bir hata ${error}`);
      throw new BadRequestException(
        'Cikis yapilirken beklenmedik bir hata olustu',
      );
    }
  }

  async enableTwoFactorAuth(userId: string) {
    try {
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new InternalServerErrorException('Kullanici bulunamadi');
      }

      user.isTwoFactorAuthEnabled = true;
      await this.userService.updateUser(userId, user);

      return {
        message: 'Iki faktorlu dogrulama basariyla etkinlestirildi',
      };
    } catch (error) {
      console.log(`Two Factor Auth Error ${error}`);
      throw new BadRequestException(
        'Iki faktorlu dogrulama etkinlestirilirken hata olustu',
      );
    }
  }

  async checkRefreshToken(refreshToken: string) {
    try {
      const userId = await this.redis.get(`refresh_token:${refreshToken}`);
      if (!userId) {
        throw new UnauthorizedException('Gecersiz refresh token');
      }

      const user = await this.userService.findById(userId);
      const newAccessToken = this.generateAccessToken(
        user.id,
        user.email,
        user.role,
      );

      const newRefreshToken = await this.generateRefreshToken(user.id);

      await this.redis.del(`refresh_token:${refreshToken}`);

      return {
        statusCode: 200,
        message: 'Tekrar token basariyla olusturuldu',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      console.log(`Refresh Token dogrulanirken bir hata olustu: ${error}`);
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  private generateAccessToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    return this.jwtService.sign(payload);
  }

  private async generateRefreshToken(userId: string) {
    try {
      const refreshToken = randomBytes(64).toString('hex');

      const ttl = this.configService.get<number>('REFRESH_TOKEN_TTL') || 604800;

      await this.redis.set(`refresh_token:${refreshToken}`, userId, 'EX', ttl);
      return refreshToken;
    } catch (error) {
      throw new InternalServerErrorException(
        'Refresh token olusturulurken hata',
      );
    }
  }

  private async updateTwoFactorAuthCode(id: string, code: string) {
    try {
      await this.redis.set(`2fa_code:${id}`, code, 'EX', 300);
    } catch (error) {
      console.log(
        `2FA Code Redis'e set edilirken hata ${error}, ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Redis yazma hatasi updateTwoFactorAuthCode',
      );
    }

    return { message: 'Iki faktorlu dogrulama kodu guncellendi' };
  }

  private async generateTwoFactorAuthCode(data: { userId: string }) {
    try {
      const code = randomInt(100000, 999999).toString();

      await this.updateTwoFactorAuthCode(data.userId, code);

      return code;
    } catch (error) {
      console.log(`2FA Kod uretilirken hata olustu generateTwoFactorAuthCode`);
      throw new InternalServerErrorException(
        'Iki faktorlu dogrulama kodu uretilirken hata',
      );
    }
  }

  private async checkTwoFactorAuthCode(data: { userId: string; code: string }) {
    try {
      const user = await this.userService.findById(data.userId);
      if (!user) {
        throw new InternalServerErrorException('Kullanici bulunamadi');
      }

      const storedCode = await this.redis.get(`2fa_code:${data.userId}`);

      if (!storedCode || !data.code) {
        throw new BadRequestException('Gecersiz dogrulama kodu');
      }

      if (storedCode.length !== data.code.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        throw new BadRequestException('Gecersiz dogrulama kodu');
      }

      const isValid = timingSafeEqual(
        Buffer.from(storedCode),
        Buffer.from(data.code),
      );

      if (!isValid) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        throw new BadRequestException('Gecersiz dogrulama kodu');
      }

      await this.redis.del(`2fa_code:${data.userId}`);
      return true;
    } catch (error) {
      console.log(`2FA Kod dogrulanirken hata ${error}`);
      throw new InternalServerErrorException(
        'Iki faktorlu dogrulama kodu dogrulanirken hata',
      );
    }
  }
}
