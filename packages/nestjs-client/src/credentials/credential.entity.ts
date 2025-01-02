import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('credentials')
export class CredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', nullable: false })
  credentialDefinitionId!: string

  @Column({ type: 'varchar', nullable: false })
  revocationDefinitionId!: string

  @Column({ type: 'integer', nullable: false })
  revocationRegistryIndex!: number

  @Column({ type: 'integer', nullable: false })
  maximumCredentialNumber!: number

  @Column({ type: 'varchar', nullable: true })
  connectionId?: string

  @Column({ type: 'varchar', nullable: true })
  threadId?: string

  @Column({ type: 'varchar', nullable: true })
  hash?: string

  @Column({ nullable: true })
  revoked?: boolean

  @CreateDateColumn()
  createdTs?: Date

  @UpdateDateColumn()
  updatedTs?: Date
}
