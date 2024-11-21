import { Module, DynamicModule } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { CONNECTIONS_EVENT, ConnectionsModuleOptions } from './connection.config'
import { ConnectionsEventController } from './connection.controller'
import { ConnectionEntity } from './connection.entity'
import { ConnectionsRepository } from './connection.repository'
import { ConnectionsEventService } from './connection.service'

@Module({})
export class ConnectionsEventModule {
  static forRoot(options: ConnectionsModuleOptions): DynamicModule {
    return {
      module: ConnectionsEventModule,
      imports: [TypeOrmModule.forFeature([ConnectionEntity]), ...options.imports],
      controllers: [ConnectionsEventController],
      providers: [
        ConnectionsEventService,
        ConnectionsRepository,
        {
          provide: CONNECTIONS_EVENT,
          useClass: options.eventHandler,
        },
      ],
    }
  }
}
