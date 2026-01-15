import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { DatabaseModule } from './lib/database/database.module';
import { MailModule } from './lib/mail/mail.module';
import { MailService } from './lib/mail/mail.service';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { MicroserviceClientService } from './lib/transport/microservice-client.service';
import { ConsulHelperService } from './lib/consul/consul-helper.service';

@Module({
  imports: [
    MailModule,
    PassportModule,
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET bulunamadi');
        }

        if (secret.length < 32) {
          throw new Error('JWT_SECRET en az 32 karakter uzunlugunda olmalidir');
        }

        const expiresIn = configService.get<number>('JWT_EXPIRES_IN') || 3600;

        return {
          secret,
          signOptions: expiresIn as any,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [SharedService, MicroserviceClientService, ConsulHelperService],
  exports: [
    SharedService,
    MailModule,
    MicroserviceClientService,
    ConsulHelperService,
  ],
})
export class SharedModule {}
