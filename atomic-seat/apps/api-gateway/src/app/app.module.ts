import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from '@atomic-seat/shared';
import { AuthController } from './auth/auth.controller';

@Module({
  imports: [SharedModule],
  controllers: [AppController, AuthController],
  providers: [AppService],
})
export class AppModule {}
