import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Venues } from '../venues/venues.entity';
import { EventSeat } from './event-seat.entity';

export enum EventType {
  CONCERT = 'CONCERT',
  SPORTS = 'SPORTS',
  THEATER = 'THEATER',
  OPERA = 'OPERA',
  EDUCATIONAL = 'EDUCATIONAL',
}

@Entity('events')
export class Events {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'type', nullable: false, type: 'enum', enum: EventType })
  eventType: EventType;

  @Column({ nullable: false })
  name: string;

  @Column({ type: 'int' })
  capacity: number;

  @Column()
  description: string;

  @Column({ nullable: false })
  start_date: Date;

  @Column({ nullable: false })
  end_date: Date;

  @Column({ nullable: true })
  venue_id: string;

  //Bir event'in bir mekani olabilir
  @ManyToOne(() => Venues, (venue) => venue.events, {
    eager: false,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'venue_id' })
  venue: Venues;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'cancelled', 'sold_out', 'preparing'],
  })
  status: string;

  @Column({ type: 'int', default: 0 })
  total_seats: number;

  @Column({ type: 'int', default: 0 })
  available_seats: number;

  @Column({ type: 'int', default: 0 })
  reserved_seats: number;

  @Column({ type: 'int', default: 0 })
  sold_seats: number;

  //Bir eventin birden fazla event seati olabilir
  @OneToMany(() => EventSeat, (seat) => seat.event)
  seats: EventSeat[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  deleted_at: Date;
}
