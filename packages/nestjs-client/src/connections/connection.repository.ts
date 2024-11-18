import { ExtendedDidExchangeState } from '@2060.io/model'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { ConnectionEntity } from './connection.entity'

export interface IConnectionsRepository {
  create(connection: Partial<ConnectionEntity>): Promise<ConnectionEntity>
  findAll(): Promise<ConnectionEntity[]>
  findById(id: string): Promise<ConnectionEntity | undefined>
  updateStatus(id: string, status: ExtendedDidExchangeState): Promise<ConnectionEntity | undefined>
  updateLanguage(id: string, lang: string): Promise<ConnectionEntity | undefined>
}

// On memory
@Injectable()
export class InMemoryConnectionsRepository implements IConnectionsRepository {
  private connections: ConnectionEntity[] = []

  async create(connection: Partial<ConnectionEntity>): Promise<ConnectionEntity> {
    this.connections.push(connection)
    return connection
  }

  async findAll(): Promise<ConnectionEntity[]> {
    return this.connections
  }

  async findById(id: string): Promise<ConnectionEntity | undefined> {
    return this.connections.find(conn => conn.id === id)
  }

  async updateStatus(id: string, status: ExtendedDidExchangeState): Promise<ConnectionEntity | undefined> {
    const connection = await this.findById(id)
    if (connection) {
      connection.status = status
    }
    return connection
  }

  async updateLanguage(id: string, lang: string): Promise<ConnectionEntity | undefined> {
    const connection = await this.findById(id)
    if (connection) {
      connection.language = lang
    }
    return connection
  }
}

// TypeORM
@Injectable()
export class TypeOrmConnectionsRepository implements IConnectionsRepository {
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
