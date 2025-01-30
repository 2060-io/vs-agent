import { ApiClient, ApiVersion } from '@2060.io/service-agent-client'
import {
  CredentialReceptionMessage,
  MessageReceived,
  ProfileMessage,
  ReceiptsMessage,
} from '@2060.io/service-agent-model'
import { CredentialState, JsonTransformer } from '@credo-ts/core'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { MessageState } from 'credo-ts-receipts'

import { ConnectionsEventService, ConnectionsRepository } from '../connections'
import { CredentialService } from '../credentials'
import { EventHandler } from '../interfaces'
import { MessageEventOptions } from '../types'

@Injectable()
export class MessageEventService {
  private readonly logger = new Logger(MessageEventService.name)
  private readonly url: string
  private readonly version: ApiVersion
  private readonly apiClient: ApiClient

  constructor(
    @Inject('GLOBAL_MODULE_OPTIONS') private options: MessageEventOptions,
    @Optional() @Inject('MESSAGE_EVENT') private eventHandler?: EventHandler,
    @Optional() @Inject() private credentialService?: CredentialService,
    @Optional() @Inject() private connRepository?: ConnectionsRepository,
    @Optional() @Inject() private connEvent?: ConnectionsEventService,
  ) {
    if (!options.url) throw new Error(`For this module to be used the value url must be added`)
    this.url = options.url
    this.version = options.version ?? ApiVersion.V1

    if (!credentialService)
      this.logger.warn(
        `To handle credential events and their revocation, make sure to initialize the CredentialService.`,
      )

    this.apiClient = new ApiClient(this.url, this.version)

    this.logger.debug(`Initialized with url: ${this.url}, version: ${this.version}`)
  }

  async received(event: MessageReceived): Promise<void> {
    const message = event.message
    const body = new ReceiptsMessage({
      connectionId: message.connectionId,
      receipts: [
        {
          messageId: message.id,
          state: MessageState.Viewed,
          timestamp: new Date(),
        },
      ],
    })
    this.logger.debug(`messageReceived: sent receipts: ${JSON.stringify(body)}`)

    await this.apiClient.messages.send(body)

    if (this.eventHandler) {
      if (message.type === CredentialReceptionMessage.type) {
        try {
          const msg = JsonTransformer.fromJSON(message, CredentialReceptionMessage)
          const isCredentialDone = msg.state === CredentialState.Done
          if (this.credentialService) {
            if (!msg.threadId) throw new Error('threadId is required for credential')
            if (isCredentialDone) await this.credentialService.handleAcceptance(msg.threadId)
            else await this.credentialService.handleRejection(msg.threadId)
          }
        } catch (error) {
          this.logger.error(`Cannot create the registry: ${error}`)
        }
      } else if (this.connRepository && this.connEvent && message.type === ProfileMessage.type) {
        const msg = JsonTransformer.fromJSON(message, ProfileMessage)
        await this.connRepository.updateLanguage(msg.connectionId, { ...msg })
        await this.connEvent?.handleNewConnection(msg.connectionId)
      }

      await this.eventHandler.inputMessage(message)
    }
  }

  async updated(): Promise<void> {}
}
