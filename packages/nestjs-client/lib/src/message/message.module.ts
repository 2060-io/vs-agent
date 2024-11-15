import { Module } from '@nestjs/common'

import { MessageEventController } from './message.controller'
import { MessageEventService } from './message.service'

@Module({
  controllers: [MessageEventController],
  providers: [MessageEventService],
  exports: [MessageEventService],
})
export class MessageEventModule {}
