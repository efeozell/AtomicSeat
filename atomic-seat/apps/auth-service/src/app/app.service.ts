import { CreateUserDto, LoginUserDto } from '@atomic-seat/shared';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserService } from '../modules/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AppService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async register(dto: CreateUserDto) {
    try {
      const user = await this.userService.createUser(dto);

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

      const isPasswordValid = await bcrypt;
    } catch (error) {}
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
