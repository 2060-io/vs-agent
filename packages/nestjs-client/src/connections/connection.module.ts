import { Module, DynamicModule, Provider } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

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
      ],
      exports: [ConnectionsEventService],
    }
  }
}
