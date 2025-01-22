import { DynamicModule, Module } from '@nestjs/common'

import { MessageEventOptions } from '../types'

import { MessageEventController } from './message.controller'
import { MessageEventService } from './message.service'

@Module({})
export class MessageEventModule {
  static forRoot(options: MessageEventOptions): DynamicModule {
    if (!options.eventHandler) {
      throw new Error('Event handler is required but not provided.')
    }
    return {
      module: MessageEventModule,
      imports: options.imports,
      controllers: [MessageEventController],
      providers: [
        MessageEventService,
        {
          provide: 'GLOBAL_MODULE_OPTIONS',
          useValue: options,
        },
        {
          provide: 'MESSAGE_EVENT',
          useClass: options.eventHandler,
        },
      ],
    }
  }
}
