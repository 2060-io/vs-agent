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
} from '@2060.io/service-agent-model'
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
    let session: SessionEntity = null

    session = await this.handleSession(message.connectionId)

    switch (message.type) {
      case TextMessage.type:
        content = JsonTransformer.fromJSON(message, TextMessage)
        break
      case ContextualMenuSelectMessage.type:
        inMsg = JsonTransformer.fromJSON(message, ContextualMenuSelectMessage)
        this.handleContextualAction(inMsg.selectionId, session.state)
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
          lang: inMsg.preferredLanguage,
        })
        await this.welcomeMessage(session.connectionId)
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
    if (content == null) return

    await this.handleStateInput(content, session)
  }

  async newConnection(event: ConnectionStateUpdated): Promise<void> {
    await this.handleSession(event.connectionId)
  }

  private handleContextualAction(selectionId: string, state: StateStep) {
    throw new Error('Function not implemented.')
  }
  
  private async handleStateInput(content: any, session: SessionEntity) {
    switch (session.state) {
      case StateStep.START:
        await this.welcomeMessage(session.connectionId)
        break
      default:
        break
    }
  }
  
  private async welcomeMessage(connectionId: string) {
    const lang = (await this.handleSession(connectionId)).lang
    await this.sendText(connectionId, 'WELCOME', lang)
  }
  
  private async handleSession(connectionId: string): Promise<SessionEntity> {
    let session = await this.sessionRepository.findOneBy({
      connectionId: connectionId,
    })
    this.logger.log('inputMessage session: ' + session)
  
    if (!session) {
      session = this.sessionRepository.create({
        connectionId: connectionId,
        state: StateStep.START,
      })
  
      await this.sessionRepository.save(session)
      this.logger.log('New session: ' + session)
    }
    return session
  }

  private async sendText(connectionId: string, text: string, lang: string) {
    await this.apiClient.messages.send(
      new TextMessage({
        connectionId: connectionId,
        content: this.getText(text, lang),
      })
    )
  }

  private getText(text: string, lang: string): string {
    return this.i18n.t(`msg.${text}`, { lang: lang })
  }
}

