import { Module, DynamicModule, Provider, Type } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EventHandler, EVENT_HANDLER } from '../interfaces'

import {
  CONNECTIONS_MODULE_OPTIONS,
  CONNECTIONS_REPOSITORY,
  ConnectionsModuleOptions,
} from './connection.config'
import { ConnectionsEventController } from './connection.controller'
import { ConnectionEntity } from './connection.entity'
import { InMemoryConnectionsRepository, TypeOrmConnectionsRepository } from './connection.repository'
import { ConnectionsEventService } from './connection.service'
import { ensureDatabaseExists, getTypeOrmConfig } from './database.utils'

@Module({})
export class ConnectionsEventModule {
  static async register(options: ConnectionsModuleOptions = {}): Promise<DynamicModule> {
    const imports = []
    let repositoryProvider: Provider

    if (options.useTypeOrm && options.database) {
      const typeOrmConfig = getTypeOrmConfig(options.database)
      await ensureDatabaseExists(options.database)

      imports.push(TypeOrmModule.forFeature([ConnectionEntity]), TypeOrmModule.forRoot(typeOrmConfig))

      repositoryProvider = {
        provide: CONNECTIONS_REPOSITORY,
        useClass: TypeOrmConnectionsRepository,
      }
    } else {
      repositoryProvider = {
        provide: CONNECTIONS_REPOSITORY,
        useClass: InMemoryConnectionsRepository,
      }
    }

    const eventHandlerProvider: Provider = {
      provide: EVENT_HANDLER,
      useFactory: async (...args: any[]) => {
        if (!options.eventHandler) {
          return null
        }

        if (typeof options.eventHandler === 'object') {
          return options.eventHandler
        }

        const handler = new (options.eventHandler as Type<EventHandler>)(...args)
        return handler
      },
      inject: [],
    }
    return {
      module: ConnectionsEventModule,
      imports,
      controllers: [ConnectionsEventController],
      providers: [
        ConnectionsEventService,
        repositoryProvider,
        {
          provide: CONNECTIONS_MODULE_OPTIONS,
          useValue: options,
        },
        eventHandlerProvider,
      ],
      exports: [ConnectionsEventService],
    }
  }
}
