import { BaseMessage, ConnectionStateUpdated, ProfileMessage, TextMessage } from '@2060.io/model';
import { EventHandler } from '@2060.io/nestjs-client';
import { ApiClient, ApiVersion } from '@2060.io/service-agent-client';
import { Injectable } from '@nestjs/common';
import { SessionEntity } from './models';
import { JsonTransformer, utils } from '@credo-ts/core';
import { StateStep } from './common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CoreService implements EventHandler {
  private readonly apiClient: ApiClient;

  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
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
    const welcome = new TextMessage({
      connectionId: event.connectionId,
      content: 'Bienvenido'
    })
    await this.apiClient.messages.send(welcome)
  }

}
