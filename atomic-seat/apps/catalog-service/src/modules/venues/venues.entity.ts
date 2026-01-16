import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Events } from '../events/events.entity';

@Entity('venues')
export class Venues {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column({ type: 'int' })
  capacity: number;

  //Bir mekanin birden fazla eventi olabilir
  @OneToMany(() => Events, (event) => event.venue)
  events: Events[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  deleted_at: Date;
}
