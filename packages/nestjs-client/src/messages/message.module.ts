import { ApiVersion } from '@2060.io/service-agent-client'
import { DynamicModule, Module, Provider, Type } from '@nestjs/common'

import { EVENT_HANDLER, EventHandler } from '../interfaces'

import { MESSAGE_MODULE_OPTIONS, MessageModuleOptions } from './message.config'
import { MessageEventController } from './message.controller'
import { MessageEventService } from './message.service'

@Module({})
export class MessageEventModule {
  static register(
    options: MessageModuleOptions = {
      url: 'http://localhost',
      version: ApiVersion.V1,
    },
  ): DynamicModule {
    const optionsProvider: Provider = {
      provide: MESSAGE_MODULE_OPTIONS,
      useValue: {
        ...options,
      },
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
      module: MessageEventModule,
      controllers: [MessageEventController],
      providers: [MessageEventService, optionsProvider, eventHandlerProvider],
      exports: [MessageEventService],
    }
  }
}
