import { Module, DynamicModule, Global } from '@nestjs/common'

import { ConnectionsEventModule } from './connections'
import { CredentialModule } from './credentials'
import { MessageEventModule } from './messages'
import { EventsModuleOptions } from './types'

@Global()
@Module({})
export class EventsModule {
  static register(options: EventsModuleOptions): DynamicModule {
    const imports = []
    const { modules, options: moduleOptions } = options

    if (modules.messages) {
      imports.push(
        MessageEventModule.forRoot({
          eventHandler: moduleOptions.eventHandler,
          imports: moduleOptions.imports ?? [],
          url: moduleOptions.url,
          version: moduleOptions.version,
        }),
      )
    }

    if (modules.connections) {
      imports.push(
        ConnectionsEventModule.forRoot({
          eventHandler: moduleOptions.eventHandler,
          imports: moduleOptions.imports ?? [],
          useMessages: modules.messages,
        }),
      )
    }

    if (modules.credentials) {
      imports.push(
        CredentialModule.forRoot({
          imports: moduleOptions.imports ?? [],
          url: moduleOptions.url,
          version: moduleOptions.version,
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
