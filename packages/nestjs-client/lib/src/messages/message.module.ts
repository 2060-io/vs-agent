import { DynamicModule, Module, Provider, Type } from '@nestjs/common'

import { MessageHandler } from '../interfaces'

import { MESSAGE_HANDLER, MESSAGE_MODULE_OPTIONS, MessageModuleOptions } from './message.config'
import { MessageEventController } from './message.controller'
import { MessageEventService } from './message.service'

@Module({})
export class MessageEventModule {
  static register(options: MessageModuleOptions = {}): DynamicModule {
    const optionsProvider: Provider = {
      provide: MESSAGE_MODULE_OPTIONS,
      useValue: options,
    }

    const messageHandlerProvider: Provider = {
      provide: MESSAGE_HANDLER,
      useFactory: async (...args: any[]) => {
        if (!options.messageHandler) {
          return null
        }

        if (typeof options.messageHandler === 'object') {
          return options.messageHandler
        }

        const handler = new (options.messageHandler as Type<MessageHandler>)(...args)
        return handler
      },
      inject: [],
    }

    return {
      module: MessageEventModule,
      controllers: [MessageEventController],
      providers: [MessageEventService, optionsProvider, messageHandlerProvider],
      exports: [MessageEventService],
    }
  }
}
