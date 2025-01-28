import { ExtendedDidExchangeState } from '@2060.io/service-agent-model'
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

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

  @Column({ type: 'varchar', nullable: true })
  lang?: string

  @CreateDateColumn()
  createdTs?: Date

  @UpdateDateColumn()
  updatedTs?: Date

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>
}
