import { ApiClient, ApiVersion } from '@2060.io/service-agent-client'
import {
  CredentialReceptionMessage,
  CredentialState,
  MessageReceived,
  ReceiptsMessage,
} from '@2060.io/service-agent-model'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MessageState } from 'credo-ts-receipts'
import { Repository } from 'typeorm'

import { ConnectionsRepository } from '../connections'
import { EventHandler } from '../interfaces'
import { RevocationEntity } from '../models'

import { MESSAGE_EVENT, MESSAGE_MODULE_OPTIONS, MessageModuleOptions } from './message.config'

@Injectable()
export class MessageEventService {
  private readonly logger = new Logger(MessageEventService.name)
  private readonly url: string
  private readonly version: ApiVersion
  private readonly apiClient: ApiClient

  constructor(
    @Inject(MESSAGE_MODULE_OPTIONS) private options: MessageModuleOptions,
    @InjectRepository(RevocationEntity)
    private readonly revocationRepository: Repository<RevocationEntity>,
    private readonly connectionRepository: ConnectionsRepository,
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
      if (event.message instanceof CredentialReceptionMessage) {
        try {
          const credential = (await this.apiClient.credentialTypes.getAll())[0]

          const connectionId = await this.connectionRepository.findById(event.message.connectionId)

          if (connectionId && event.message.state === CredentialState.Done) {
            const credentialRev = this.revocationRepository.create({
              connection: connectionId,
              hash: Buffer.from(await this.eventHandler.credentialHash(event.message.connectionId)),
              revocationDefinitionId: credential.revocationId,
            })
            await this.revocationRepository.save(credentialRev)
          }
        } catch (error) {
          this.logger.error(`Cannot create the registry: ${error}`)
        }
      }

      await this.eventHandler.inputMessage(event.message)
    }
  }

  async updated(): Promise<void> {}
}
