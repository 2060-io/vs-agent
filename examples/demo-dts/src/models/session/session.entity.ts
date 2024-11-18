// session.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StateStep } from '../../common';

@Entity({ name: 'session' })
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  connectionId: string;

  @Column({
    type: 'enum',
    enum: StateStep,
  })
  state: StateStep;

  /**
   * More params...
   */
}
