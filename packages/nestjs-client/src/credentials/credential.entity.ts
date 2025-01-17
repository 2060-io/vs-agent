import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

import { CredentialStatus } from '../types'

@Entity('credentials')
export class CredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', nullable: false })
  credentialDefinitionId!: string

  @Column({ type: 'varchar', nullable: true })
  revocationDefinitionId?: string

  @Column({ type: 'integer', nullable: true })
  revocationRegistryIndex?: number

  @Column({ type: 'varchar', nullable: true })
  connectionId?: string

  @Column({ type: 'varchar', nullable: true })
  threadId?: string

  @Column({ type: 'varchar', nullable: true })
  refIdHash?: string

  @Column({ nullable: true })
  status?: CredentialStatus

  @CreateDateColumn()
  createdTs?: Date

  @UpdateDateColumn()
  updatedTs?: Date
}
