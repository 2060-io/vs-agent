import {
  Event,
  MessageReceived,
  MessageStateUpdated,
  ReceiptsMessage,
} from '@2060.io/model'
import { Injectable, Logger } from '@nestjs/common'
import { MessageState } from 'credo-ts-receipts'
import { ApiClient } from '@2060.io/service-agent-client'

const apiClient = new ApiClient('') //TODO: add baseURL

@Injectable()
export class MessageEventService {
  private readonly logger = new Logger(MessageEventService.name)

  async messageReceived(event: MessageReceived): Promise<any> {

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

    return null
  }

  async messageStateUpdated(event: MessageStateUpdated): Promise<any> {
    return null
  }
}
