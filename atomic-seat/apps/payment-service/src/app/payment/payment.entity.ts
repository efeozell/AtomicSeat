import { Column, Entity, PrimaryGeneratedColumn, VersionColumn } from 'typeorm';

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  IYZICO = 'IYZICO',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity()
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  //Booking bilgileri
  @Column()
  booking_id: string;

  @Column()
  user_id: string;

  //Odeme bilgileri
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'TRY' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider: PaymentProvider;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  //Provider session bilgileri

  @Column({ unique: true })
  session_id: string;

  @Column({ nullable: true })
  checkout_url: string;

  @Column({ nullable: true })
  provider_payment_id: string;

  //Guvenlik
  @Column()
  security_token: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  //Iade bilgileri
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refunded_amount: number;

  @Column({ type: 'timestamp', nullable: true })
  refunded_at: Date;

  @Column({ nullable: true })
  refunded_reason: string;

  //Hata bilgileri
  @Column({ type: 'text', nullable: true })
  error_message: string;

  @VersionColumn()
  version: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;
}
