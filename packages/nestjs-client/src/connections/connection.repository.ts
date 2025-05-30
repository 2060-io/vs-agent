import { ExtendedDidExchangeState } from '@2060.io/vs-agent-model'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { UserProfile } from '../types'

import { ConnectionEntity } from './connection.entity'

// TypeORM
@Injectable()
export class ConnectionsRepository {
  constructor(
    @InjectRepository(ConnectionEntity)
    private readonly repository: Repository<ConnectionEntity>,
  ) {}

  async create(connection: Partial<ConnectionEntity>): Promise<ConnectionEntity> {
    const entity = this.repository.create(connection)
    return await this.repository.save(entity)
  }

  async findAll(): Promise<ConnectionEntity[]> {
    return await this.repository.find()
  }

  async findById(id: string): Promise<ConnectionEntity | undefined> {
    return (await this.repository.findOne({ where: { id } })) ?? undefined
  }

  async updateStatus(id: string, status: ExtendedDidExchangeState): Promise<ConnectionEntity | undefined> {
    await this.repository.update(id, { status })
    return (await this.repository.findOne({ where: { id } })) ?? undefined
  }

  async updateUserProfile(id: string, userProfile: UserProfile): Promise<ConnectionEntity | undefined> {
    await this.repository.update(id, { userProfile })
    return (await this.repository.findOne({ where: { id } })) ?? undefined
  }

  async updateMetadata(id: string, metadata: Record<string, any>): Promise<ConnectionEntity | undefined> {
    await this.repository.update(id, { metadata })
    return (await this.repository.findOne({ where: { id } })) ?? undefined
  }

  /**
   * Checks if a connection has been completed.
   *
   * This method verifies whether the connection's `lang` (if required)
   * and `metadata` meet the completion criteria.
   * @param id The unique identifier of the connection to validate
   * @param requireLang If `true`, ensures that `lang` is not `null`
   * @returns A promise that resolves to `true` if:
   *   - `metadata` is either `undefined` or a non-empty object.
   *   - If `requireLang` is `true`, `lang` must not be `null`.
   * @throws Error if the connection is not found or if `createdTs` is missing.
   */
  async isCompleted(id: string, requireLang: boolean): Promise<boolean> {
    const conn = await this.findById(id)
    if (!conn?.id) {
      throw new Error(`No connection found with id: ${id}. The connection may not have been created properly`)
    }
    if (conn.status === ExtendedDidExchangeState.Completed) return false

    const isMetadataValid = !conn.metadata || Object.keys(conn.metadata).length > 0
    const isLangValid = !requireLang || conn.userProfile?.preferredLanguage != null
    if (isLangValid && isMetadataValid) {
      this.updateStatus(conn.id, ExtendedDidExchangeState.Completed)
      return true
    }
    return false
  }
}
