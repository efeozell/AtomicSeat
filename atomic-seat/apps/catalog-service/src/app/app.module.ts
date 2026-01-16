import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '@atomic-seat/shared';

@Module({
  imports: [DatabaseModule.forRoot('CATALOG_DB_NAME')],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
