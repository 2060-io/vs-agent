import { Module, DynamicModule } from '@nestjs/common'

import { ConnectionsEventModule } from './connections'
import { MessageEventModule } from './messages'
import { EventsModuleOptions } from './types'

@Module({})
export class EventsModule {
  static register(options: EventsModuleOptions): DynamicModule {
    const imports = []
    const { modules, options: moduleOptions } = options

    if (modules.messages && moduleOptions.eventHandler) {
      imports.push(
        MessageEventModule.forRoot({
          eventHandler: moduleOptions.eventHandler,
          imports: moduleOptions.imports ?? [],
          url: moduleOptions.url,
          version: moduleOptions.version,
        }),
      )
    }

    if (modules.connections && moduleOptions.eventHandler) {
      imports.push(
        ConnectionsEventModule.forRoot({
          eventHandler: moduleOptions.eventHandler,
          imports: moduleOptions.imports ?? [],
        }),
      )
    }

    return {
      module: EventsModule,
      imports,
      exports: imports,
    }
  }
}
