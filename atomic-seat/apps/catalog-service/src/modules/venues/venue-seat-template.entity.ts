//Burasi Mekanin fiziksel koltuk planinin tasarim bilgilerinin tutuldugu entity olucak.

import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Venues } from './venues.entity';

//Burada fiyat, durum bilgisi degil sadece koltugun fiziksel olarak bilgileri tutulacak
@Entity('venue_seat_templates')
@Index(['venue_id', 'section', 'row', 'seat_number'], { unique: true }) //Ayni mekanda, ayni sectionda, ayni rowda ayni koltuk numarasi olamaz
@Index(['venue_id', 'section'])
export class VenueSeatTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  //Her koltugun ait oldugu bir mekan olmali
  @Column()
  venue_id: string;

  //Her koltugun bir mekani olzmali
  @ManyToOne(() => Venues, (venue) => venue.seat_templates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'venue_id' })
  venue: Venues;

  @Column({ length: 50 })
  section: string; //Ornek: A, B, C

  @Column({ length: 10 })
  row: string; //Ornek: 1, 2, 3

  @Column({ length: 10 })
  seat_number: string;

  @Column()
  seat_type: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'json', nullable: true })
  coordinates: { x: number; y: number };

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
