import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm'

import { ConnectionEntity } from '../connections'

@Entity('revocations')
export class RevocationEntity {
  @PrimaryGeneratedColumn('increment')
  id?: string

  @Column({ type: 'varchar', nullable: false })
  revocationDefinitionId?: string

  @Column({ type: 'integer', generated: 'increment', nullable: false })
  revocationRegistryIndex?: number

  @OneToOne(() => ConnectionEntity, { nullable: false })
  @JoinColumn({ name: 'connection_id', referencedColumnName: 'id' })
  connection?: ConnectionEntity

  @Column({ type: 'blob', nullable: true })
  hash?: Buffer

  @CreateDateColumn()
  createdTs?: Date

  @UpdateDateColumn()
  updatedTs?: Date
}
