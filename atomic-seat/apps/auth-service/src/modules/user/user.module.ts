import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DatabaseModule } from '@atomic-seat/shared';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';

@Module({
  imports: [
    DatabaseModule.forRoot('AUTH_DB_NAME'),
    TypeOrmModule.forFeature([User]), //Kullandigin yerde entity'i tanimlaman lazim
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
