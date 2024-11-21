import { HttpUtils } from '@2060.io/service-agent-client'
import { EventType, MessageReceived, MessageStateUpdated } from '@2060.io/service-agent-model'
import { Body, Controller, Logger, Post } from '@nestjs/common'

import { MessageEventService } from './message.service'

@Controller('')
export class MessageEventController {
  private readonly logger = new Logger(MessageEventController.name)

  constructor(private readonly message: MessageEventService) {}

  @Post(`/${EventType.MessageReceived}`)
  async received(@Body() body: MessageReceived): Promise<{ message: string }> {
    try {
      this.logger.log(`messageReceived event: ${JSON.stringify(body)}`)

      await this.message.received(body)
      return { message: 'Message received updated successfully' }
    } catch (error) {
      HttpUtils.handleException(this.logger, error, 'Failed to received message state')
    }
  }

  @Post(`/${EventType.MessageStateUpdated}`)
  async updated(@Body() body: MessageStateUpdated): Promise<{ message: string }> {
    try {
      this.logger.log(`messageStateUpdated event: ${JSON.stringify(body)}`)

      await this.message.updated()
      return { message: 'Message state updated successfully' }
    } catch (error) {
      HttpUtils.handleException(this.logger, error, 'Failed to update message state')
    }
  }
}
