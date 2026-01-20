import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VenueSeatTemplate } from '../venues/venue-seat-template.entity';
import { Events } from './events.entity';

export enum EventSeatStatus {
  PREPARING = 'preparing',
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  SOLD = 'sold',
  BLOCKED = 'blocked',
}

@Entity('event_seats')
@Index(['event_id', 'status'])
@Index(['event_id', 'venue_seat_template_id'], { unique: true }) //Ayni event icin ayni koltuk tekrar edemez
@Index(['reserved_by'])
@Index(['sold_to'])
export class EventSeat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  event_id: string;

  //Bir koltugun bir eventi olmali
  @ManyToOne(() => Events, (event) => event.seats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Events;

  @Column()
  venue_seat_template_id: string;

  @ManyToOne(() => VenueSeatTemplate, { eager: true })
  @JoinColumn({ name: 'venue_seat_template_id' })
  seat_template: VenueSeatTemplate;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: EventSeatStatus,
    default: EventSeatStatus.PREPARING,
  })
  status: string;

  @Column({ nullable: true })
  reserved_by: string;

  @Column({ type: 'timestamp', nullable: true })
  reserved_at: Date;

  @Column({ nullable: true })
  sold_to: string;

  @Column({ nullable: true })
  order_id: string;

  @Column({ type: 'timestamp', nullable: true })
  sold_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
