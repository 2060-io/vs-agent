import { Module, DynamicModule } from '@nestjs/common'

import { ConnectionsEventModule } from './connections'
import { MessageEventModule } from './messages'

export interface EventsModuleOptions {
  prefix?: string
  enableMessages?: boolean
  enableConnections?: boolean
}

@Module({})
export class EventsModule {
  static register(options: EventsModuleOptions = {}): DynamicModule {
    const imports = []

    if (options.enableMessages !== false) {
      imports.push(MessageEventModule)
    }

    if (options.enableConnections !== false) {
      imports.push(ConnectionsEventModule)
    }

    return {
      module: EventsModule,
      imports,
      exports: imports,
    }
  }
}
