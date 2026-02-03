import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  //Notification tipi (email, sms, push)
  @Column()
  type: string;

  //Event tipi (booking.confirmed, booking.cancelled)
  @Column()
  event_type: string;

  @Column()
  recipient: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column()
  status: string;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'timestamp', nullable: true })
  sent_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  provider_response: any;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
