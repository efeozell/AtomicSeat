import { IsString } from 'class-validator';
import { timestamp } from 'rxjs';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  VersionColumn,
} from 'typeorm';
import { BookingSeat } from './booking-seat.entity';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  user_id: string;

  @Column()
  event_id: string;

  @Column({ type: 'jsonb' })
  seat_ids: string[];

  @Column({ type: 'jsonb' })
  seat_details: Array<{
    seatId: string;
    price: number;
  }>;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_price: number;

  @Column({ default: 'TRY' })
  currency: string;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ nullable: true })
  payment_id: string;

  @Column({ nullable: true })
  payment_method: string;

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date;

  @Column({ nullable: true })
  cancelled_reason: string;

  @Column({ type: 'timestamp', nullable: true })
  cancalled_at: Date;

  @VersionColumn()
  version: number;

  @OneToMany(() => BookingSeat, (bookingSeat) => bookingSeat.booking)
  booking_seats: BookingSeat[];

  @Column({ nullable: true })
  payment_session_id: string;

  @Column({ nullable: true })
  payment_provider: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
