import { Module, DynamicModule } from '@nestjs/common'

import { ConnectionEventOptions } from '../types'

import { ConnectionsEventController } from './connection.controller'
import { ConnectionsRepository } from './connection.repository'
import { ConnectionsEventService } from './connection.service'

@Module({})
export class ConnectionsEventModule {
  static forRoot(options: ConnectionEventOptions): DynamicModule {
    return {
      module: ConnectionsEventModule,
      imports: options.imports,
      controllers: [ConnectionsEventController],
      providers: [
        ConnectionsEventService,
        ConnectionsRepository,
        {
          provide: 'CONNECTIONS_EVENT',
          useValue: options.eventHandler,
        },
      ],
      exports: [ConnectionsRepository],
    }
  }
}
