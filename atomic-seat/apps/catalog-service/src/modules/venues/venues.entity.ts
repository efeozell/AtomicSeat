import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Events } from '../events/events.entity';
import { VenueSeatTemplate } from './venue-seat-template.entity';

@Entity('venues')
//Index  = Aramalari hizlandiran yapi
export class Venues {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column()
  country: string;

  @Column({ type: 'int' })
  total_capacity: number;

  @Column({ default: true })
  is_active: boolean;

  //Bir mekanin birden fazla koltugu olabilir
  @OneToMany(() => VenueSeatTemplate, (seat) => seat.venue, { cascade: true })
  seat_templates: VenueSeatTemplate[];

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
