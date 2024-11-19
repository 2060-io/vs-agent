import { BaseMessage, ConnectionStateUpdated, ProfileMessage, TextMessage } from '@2060.io/model';
import { ApiClient, ApiVersion, EventHandler } from '@2060.io/service-agent-client';
import { Injectable } from '@nestjs/common';
import { SessionEntity } from './models';
import { JsonTransformer, utils } from '@credo-ts/core';
import { StateStep } from './common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nContext, I18nService } from 'nestjs-i18n';

@Injectable()
export class CoreService implements EventHandler {
  private readonly apiClient: ApiClient;

  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    private readonly i18n: I18nService
  ) {
    const baseUrl = process.env.SERVICE_AGENT_ADMIN_BASE_URL || '';
    const apiVersion = (process.env.API_VERSION as ApiVersion) || ApiVersion.V1;
    this.apiClient = new ApiClient(baseUrl, apiVersion);
  }

  async inputMessage(message: BaseMessage): Promise<void> {
    switch (message.type) {
      case TextMessage.type:
        await this.apiClient.messages.send(message)
        break
      case ProfileMessage.type:
        const msg = JsonTransformer.fromJSON(message, ProfileMessage)
        await this.sessionRepository.save({
          connectionId: msg.connectionId,
          lang: msg.preferredLanguage,
          state: StateStep.START
        })
        break
      default:
        break
    }
  }

  async newConnection(event: ConnectionStateUpdated): Promise<void> {
    console.log("TEST TEST TEST: begin")
    console.log("TEST TEST TEST: "+ this.i18n.t('msg.WELCOME', { lang: 'es' }))
    const welcome = new TextMessage({
      connectionId: event.connectionId,
      content: this.i18n.t('msg.WELCOME', { lang: 'es' })
    })
    await this.apiClient.messages.send(welcome)
  }

}
