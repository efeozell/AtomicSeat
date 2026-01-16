import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VenueSeatTemplate } from '../venues/venue-seat-template.entity';

@Entity()
export class EventSeat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  event_id: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column()
  venue_seat_id: string;

  @ManyToOne(() => VenueSeatTemplate, { eager: true })
  @JoinColumn({ name: 'venue_seat_id' })
  seat_template: VenueSeatTemplate;

  @Column({ type: 'decimal' })
  price: number;

  @Column({
    type: 'enum',
    enum: ['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED'],
    default: 'AVAILABLE',
  })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  sold_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
