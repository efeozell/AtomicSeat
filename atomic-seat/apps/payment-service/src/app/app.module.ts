import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule, SharedModule } from '@atomic-seat/shared';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment/payment.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    DatabaseModule.forRoot('PAYMENT_DB_NAME'),
    TypeOrmModule.forFeature([Payment]),
    SharedModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
