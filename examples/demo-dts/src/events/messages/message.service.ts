import { MessageReceived, MessageStateUpdated, ReceiptsMessage } from '@2060.io/model'
import { ApiClient, ApiVersion } from '@2060.io/service-agent-client'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { MessageState } from 'credo-ts-receipts'
import { CoreService } from '../../app.service'

@Injectable()
export class MessageEventService {
  private readonly logger = new Logger(MessageEventService.name)
  private readonly url: string
  private readonly version: ApiVersion
  private readonly apiClient: ApiClient

  constructor(
    private readonly coreService: CoreService,
  ) {
    this.url = process.env.SERVICE_AGENT_ADMIN_BASE_URL
    this.version = process.env.API_VERSION as ApiVersion

    this.apiClient = new ApiClient(this.url, this.version)

    this.logger.debug(`Initialized with url: ${this.url}, version: ${this.version}`)
  }

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

    await this.apiClient.messages.send(body)

    await this.coreService.inputMessage(event.message)

    return null
  }

  async updated(event: MessageStateUpdated): Promise<any> {
    return event
  }
}
