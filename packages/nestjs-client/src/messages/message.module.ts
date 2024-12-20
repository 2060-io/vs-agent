import { DynamicModule, Module } from '@nestjs/common'

import { MessageEventOptions } from '../types'

import { MessageEventController } from './message.controller'
import { MessageEventService } from './message.service'

@Module({})
export class MessageEventModule {
  static forRoot(options: MessageEventOptions): DynamicModule {
    return {
      module: MessageEventModule,
      imports: options.imports,
      controllers: [MessageEventController],
      providers: [
        MessageEventService,
        {
          provide: 'EVENT_MODULE_OPTIONS',
          useValue: options,
        },
        {
          provide: 'MESSAGE_EVENT',
          useValue: options.eventHandler,
        },
      ],
    }
  }
}
