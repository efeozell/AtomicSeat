import { RedisModule } from '@nestjs-modules/ioredis';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({})
export class DatabaseModule {
  static forRoot(dbNameEnvKey: string): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        RedisModule.forRootAsync({
          useFactory: (configService: ConfigService) => ({
            type: 'single',
            url: configService.get<string>('REDIS_URL'),
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            const host = configService.get<string>('DB_HOST');
            const port = Number(configService.get<string>('DB_PORT')) || 5432;
            const username = configService.get<string>('DB_USERNAME');
            const password = configService.get<string>('DB_PASSWORD');
            const database = configService.get<string>(dbNameEnvKey);

            console.log('🔌 Database connection config:', {
              host,
              port,
              username,
              database,
              dbNameEnvKey,
            });

            if (!database) {
              throw new Error(
                `Veritabani parametresi bulunamadi! Lutfen parametre olarka '${dbNameEnvKey}' degerini saglayin.`,
              );
            }

            return {
              type: 'postgres',
              host,
              port,
              username,
              password,
              database,
              autoLoadEntities: true,
              synchronize: true, //TODO: Prod ortaminda false yapilmali
              logging: true,
            };
          },
          inject: [ConfigService],
        }),
      ],
      exports: [TypeOrmModule],
    };
  }
}
