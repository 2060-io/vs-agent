import { MessageReceived, MessageStateUpdated, ReceiptsMessage } from '@2060.io/model'
import { ApiClient } from '@2060.io/service-agent-client'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { MessageState } from 'credo-ts-receipts'

import { MessageHandler } from '../interfaces'

import { MESSAGE_HANDLER } from './message.config'

const apiClient = new ApiClient('') //TODO: add baseURL

@Injectable()
export class MessageEventService {
  private readonly logger = new Logger(MessageEventService.name)

  constructor(@Optional() @Inject(MESSAGE_HANDLER) private messageHandler?: MessageHandler) {}

  async received(event: MessageReceived): Promise<any> {
    const body = new ReceiptsMessage({
      connectionId: event.message.connectionId,
      receipts: [
        {
          messageId: event.message.id,
          state: MessageState.Viewed,
          timestamp: new Date(),
        },
      ],
    })
    this.logger.debug(`messageReceived: sent receipts: ${JSON.stringify(body)}`)

    await apiClient.messages.send(body)

    if (this.messageHandler) {
      await this.messageHandler.inputMessage(event.message)
    }

    return null
  }

  async updated(event: MessageStateUpdated): Promise<any> {
    return event
  }
}
