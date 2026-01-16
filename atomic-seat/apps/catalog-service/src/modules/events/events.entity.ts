import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Venues } from '../venues/venues.entity';

enum EventType {
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

  @Column({ nullable: false, type: 'enum', enum: EventType })
  type: EventType;

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
    enum: ['draft', 'published', 'cancelled', 'sold_out'],
  })
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  deleted_at: Date;
}
