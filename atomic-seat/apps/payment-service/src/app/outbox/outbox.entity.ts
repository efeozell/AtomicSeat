import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum OutboxStatus {
  PENDING = 'pending',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

@Entity('outbox_events')
@Index(['status', 'created_at'])
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  //hangi aggregate'e ait (payment, booking vs)
  @Column()
  aggregate_type: string;

  @Column()
  aggregate_id: string;

  @Column()
  event_type: string; //payment_created, payment_completed vs

  @Column({ type: 'jsonb' }) //eventin tasidigi data. TCP ile istek gonderirken verdigimiz datayi burada sakliyoruz.
  payload: any;

  @Column({ type: 'enum', enum: OutboxStatus, default: OutboxStatus.PENDING })
  status: OutboxStatus;

  //Kafkaya kac defa gonderilmeye calisldigini burada tutucaz
  @Column({ type: 'int', default: 0 })
  retry_count: number;

  @Column({ type: 'int', default: 3 })
  max_retries: number;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'timestamp', nullable: true })
  published_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
