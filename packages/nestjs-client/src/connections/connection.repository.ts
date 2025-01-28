import { ExtendedDidExchangeState } from '@2060.io/service-agent-model'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

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

  async updateLanguage(id: string, lang: string): Promise<ConnectionEntity | undefined> {
    await this.repository.update(id, { lang })
    return (await this.repository.findOne({ where: { id } })) ?? undefined
  }

  async updateMetadata(id: string, metadata: Record<string, any>): Promise<ConnectionEntity | undefined> {
    await this.repository.update(id, { metadata })
    return (await this.repository.findOne({ where: { id } })) ?? undefined
  }

  /**
   * Validates if the connection was updated within the last minute
   * This method ensures that either the `lang` or `metadata` properties
   * have been updated recently, based on the `createdTs` timestamp.
   * Its purpose is to trigger a new connection only once when the 
   * conditions are met.
   * @param id The unique identifier of the connection to validate 
   * @returns A promise that resolves to `true` if:
   *   - `lang` is a valid non-null string.
   *   - `metadata` is either `undefined` or a non-empty object.
   *   - The `createdTs` timestamp is within the last 60 seconds.
   * @throws Error if the connection is not found or if `createdTs` is missing.
   */
  async isUpdated(id: string): Promise<boolean> {
    const conn = await this.repository.findOneBy({ id })
    if (!conn?.createdTs) {
      throw new Error(`No connection found with id: ${id}. The connection may not have been created properly`)
    }
    const { lang, metadata, createdTs } = conn
    const isLangValid = typeof lang === 'string' && lang !== null
    const isMetadataValid = metadata === undefined || Object.keys(metadata).length > 0
    const isRecent = Date.now() - new Date(createdTs).getTime() <= 60000
    return isLangValid && isMetadataValid && isRecent
  }
}
