import { BaseMessage, ConnectionStateUpdated, ProfileMessage, TextMessage } from '@2060.io/model';
import { EventHandler } from '@2060.io/nestjs-client';
import { ApiClient, ApiVersion } from '@2060.io/service-agent-client';
import { Injectable } from '@nestjs/common';
import { SessionEntity, SessionRepository } from './models';
import { JsonTransformer } from '@credo-ts/core';
import { StateStep } from './common';

@Injectable()
export class CoreService implements EventHandler {
  private readonly apiClient: ApiClient;

  constructor(
    private readonly sessionRepository: SessionRepository
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
        const session = new SessionEntity()
        session.connectionId = msg.connectionId
        session.lang = msg.preferredLanguage
        session.state = StateStep.START
        await this.sessionRepository.save(session)
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
