import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('revocation_registries')
export class RevocationRegistryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', nullable: false })
  credentialDefinitionId!: string

  @Column({ type: 'varchar', nullable: false })
  revocationDefinitionId!: string

  @Column({ type: 'integer', nullable: false, default: 0 })
  currentIndex!: number

  @Column({ type: 'integer', nullable: false, default: 1000 })
  maximumCredentialNumber!: number

  @CreateDateColumn()
  createdTs?: Date

  @UpdateDateColumn()
  updatedTs?: Date
}
