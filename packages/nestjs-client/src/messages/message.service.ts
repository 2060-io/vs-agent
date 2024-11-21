import { MessageReceived, MessageStateUpdated, ReceiptsMessage } from '@2060.io/service-agent-model'
import { ApiClient, ApiVersion } from '@2060.io/service-agent-client'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { MessageState } from 'credo-ts-receipts'

import { EventHandler } from '../interfaces'

import { MESSAGE_EVENT, MESSAGE_MODULE_OPTIONS, MessageModuleOptions } from './message.config'

@Injectable()
export class MessageEventService {
  private readonly logger = new Logger(MessageEventService.name)
  private readonly url: string
  private readonly version: ApiVersion
  private readonly apiClient: ApiClient

  constructor(
    @Inject(MESSAGE_MODULE_OPTIONS) private options: MessageModuleOptions,
    @Optional() @Inject(MESSAGE_EVENT) private eventHandler?: EventHandler,
  ) {
    this.url = options.url
    this.version = options.version

    this.apiClient = new ApiClient(this.url, this.version)

    this.logger.debug(`Initialized with url: ${this.url}, version: ${this.version}`)
  }

  async received(event: MessageReceived): Promise<void> {
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

    await this.apiClient.messages.send(body)

    if (this.eventHandler) {
      await this.eventHandler.inputMessage(event.message)
    }
  }

  async updated(event: MessageStateUpdated): Promise<void> {
  }
}
