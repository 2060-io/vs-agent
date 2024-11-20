import { DynamicModule, Module } from '@nestjs/common'

import { MESSAGE_EVENT, MESSAGE_MODULE_OPTIONS, MessageModuleOptions } from './message.config'
import { MessageEventController } from './message.controller'
import { MessageEventService } from './message.service'

@Module({})
export class MessageEventModule {
  static forRoot(options: MessageModuleOptions): DynamicModule {
    return {
      module: MessageEventModule,
      imports: [...options.imports],
      controllers: [MessageEventController],
      providers: [
        MessageEventService,
        {
          provide: MESSAGE_MODULE_OPTIONS,
          useValue: options,
        },
        {
          provide: MESSAGE_EVENT,
          useClass: options.eventHandler,
        },
      ],
    }
  }
}
