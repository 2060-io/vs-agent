import {
  BaseMessage,
  ConnectionStateUpdated,
  ContextualMenuSelectMessage,
  CredentialReceptionMessage,
  EMrtdDataSubmitMessage,
  MediaMessage,
  MenuSelectMessage,
  MrzDataSubmitMessage,
  ProfileMessage,
  TextMessage,
} from '@2060.io/model'
import { ApiClient, ApiVersion } from '@2060.io/service-agent-client'
import { EventHandler } from '@2060.io/nestjs-client'
import { Injectable, Logger } from '@nestjs/common'
import { SessionEntity } from './models'
import { CredentialState, JsonTransformer } from '@credo-ts/core'
import { StateStep } from './common'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { I18nService } from 'nestjs-i18n'

@Injectable()
export class CoreService implements EventHandler {
  private readonly apiClient: ApiClient
  private readonly logger = new Logger(CoreService.name)

  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    private readonly i18n: I18nService,
  ) {
    const baseUrl = process.env.SERVICE_AGENT_ADMIN_BASE_URL || ''
    const apiVersion = (process.env.API_VERSION as ApiVersion) || ApiVersion.V1
    this.apiClient = new ApiClient(baseUrl, apiVersion)
  }

  async inputMessage(message: BaseMessage): Promise<void> {
    let content = null
    let inMsg = null
    let session = null

    session = await this.sessionRepository.findOneBy({
      connectionId: message.connectionId,
    })
    this.logger.log('inputMessage session: ' + session)

    if (!session) {
      session = this.sessionRepository.create({
        connectionId: message.connectionId,
        state: StateStep.START
      })
      
      await this.sessionRepository.save(session)
      this.logger.log('New session: ' + session)
    }

    switch (message.type) {
      case TextMessage.type:
        await this.apiClient.messages.send(message)
        break
      case ContextualMenuSelectMessage.type:
        inMsg = JsonTransformer.fromJSON(message, ContextualMenuSelectMessage)
        handleContextualAction(inMsg.selectionId, session.state)
        break
      case MenuSelectMessage.type:
        inMsg = JsonTransformer.fromJSON(message, MenuSelectMessage)
        content = inMsg.menuItems[0].id ?? null
        break
      case MediaMessage.type:
        inMsg = JsonTransformer.fromJSON(message, MediaMessage)
        content = 'media'
        break
      case ProfileMessage.type:
        inMsg = JsonTransformer.fromJSON(message, ProfileMessage)
        await this.sessionRepository.update(session.id, {
          ...session,
          lang: inMsg.preferredLanguage
        })
        break
      case MrzDataSubmitMessage.type:
        content = JsonTransformer.fromJSON(message, MrzDataSubmitMessage)
        break
      case EMrtdDataSubmitMessage.type:
        content = JsonTransformer.fromJSON(message, EMrtdDataSubmitMessage)
        break
      case CredentialReceptionMessage.type:
        inMsg = JsonTransformer.fromJSON(message, CredentialReceptionMessage)
        switch (inMsg.state) {
          case CredentialState.Done:
            break
          case CredentialState.Declined:
            break
          default:
            break
        }
        break
      default:
        break
    }

    if (content != null) {
      content = content.trim()
      if (content.length === 0) content = null
    }
  }

  async newConnection(event: ConnectionStateUpdated): Promise<void> {
    const welcome = new TextMessage({
      connectionId: event.connectionId,
      content: this.i18n.t('msg.WELCOME', { lang: 'es' }),
    })
    await this.apiClient.messages.send(welcome)
  }
}

function handleContextualAction(selectionId: string, state: StateStep) {
  throw new Error('Function not implemented.')
}

