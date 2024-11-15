import { EventType, MessageReceived, MessageStateUpdated } from '@2060.io/model'
import { Body, Controller, Logger, Post } from '@nestjs/common'

import { MessageEventService } from './message.service'
import { HttpUtils } from '@2060.io/service-agent-client'

@Controller('')
export class MessageEventController {
  private readonly logger = new Logger(MessageEventController.name)

  constructor(private readonly message: MessageEventService) {}

  @Post(`/${EventType.MessageReceived}`)
  async messageReceived(@Body() body: MessageReceived): Promise<{ message: string }> {
    try {
      this.logger.log(`messageReceived event: ${JSON.stringify(body)}`)

      await this.message.messageReceived(body)
      return { message: 'Message received updated successfully' }      
    } catch (error) {
      HttpUtils.handleException(this.logger, error, 'Failed to received message state');  
    }
  }

  @Post(`/${EventType.MessageStateUpdated}`)
  async messageStateUpdated(@Body() body: MessageStateUpdated): Promise<{ message: string }> {
    try {
      this.logger.log(`messageStateUpdated event: ${JSON.stringify(body)}`)

      await this.message.messageStateUpdated(body)
      return { message: 'Message state updated successfully' }
    } catch (error) {
      HttpUtils.handleException(this.logger, error, 'Failed to update message state');
    }
  }
}
