import { ExtendedDidExchangeState } from '@2060.io/vs-agent-model'
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

import { UserProfile } from '../types'

@Entity('connections')
export class ConnectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id?: string

  @Column({
    type: 'enum',
    enum: ExtendedDidExchangeState,
    default: ExtendedDidExchangeState.Start,
  })
  status?: ExtendedDidExchangeState

  @Column('jsonb', { nullable: true })
  userProfile?: UserProfile

  @CreateDateColumn()
  createdTs?: Date

  @UpdateDateColumn()
  updatedTs?: Date

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>
}
