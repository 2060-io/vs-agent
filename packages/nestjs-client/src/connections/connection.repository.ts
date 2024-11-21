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
    await this.repository.update(id, { language: lang })
    return (await this.repository.findOne({ where: { id } })) ?? undefined
  }
}
