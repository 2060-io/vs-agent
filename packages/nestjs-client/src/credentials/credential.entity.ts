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

@Entity('credentials')
export class CredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string
  
  @Column({ type: 'varchar', nullable: false })
  credentialDefinitionId?: string

  @Column({ type: 'varchar', nullable: true })
  revocationDefinitionId?: string

  @Column({ type: 'integer', generated: 'increment', nullable: true })
  revocationRegistryIndex?: number

  @OneToOne(() => ConnectionEntity, { nullable: false })
  @JoinColumn({ name: 'connection_id', referencedColumnName: 'id' })
  connectionId?: ConnectionEntity

  @Column({ type: 'blob', nullable: true })
  hash?: Buffer

  @CreateDateColumn()
  createdTs?: Date

  @UpdateDateColumn()
  updatedTs?: Date
}
