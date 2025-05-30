// session.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { StateStep } from '../common'

@Entity('session')
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', nullable: false })
  connectionId: string

  @Column({ type: 'varchar', length: 10, nullable: true })
  lang?: string

  @Column({
    type: 'enum',
    enum: StateStep,
  })
  state?: StateStep

  @CreateDateColumn()
  createdTs?: Date

  @UpdateDateColumn()
  updatedTs?: Date

  /**
   * More params...
   */
}
