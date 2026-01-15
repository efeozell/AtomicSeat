import {
  BadGatewayException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from '@atomic-seat/shared';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    const { email, password, name, username } = createUserDto;

    const existingUser = this.userRepo.findOne({
      where: { email, username },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = this.userRepo.create({
      email,
      password: hashedPassword,
      name,
      username,
    });

    const savedUser = await this.userRepo.save(newUser).catch((error) => {
      throw new BadGatewayException(
        'Kullanici olusturulurken hata!',
        error.message,
      );
    });
    const { password: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async findByEmail(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new BadGatewayException('Kullanici bulunamadi');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findyByEmailWithPassword(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new BadGatewayException('Kullanici bulunamadi');
    }

    return user;
  }

  async findById(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new BadGatewayException('Kullanici bulunamadi');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
