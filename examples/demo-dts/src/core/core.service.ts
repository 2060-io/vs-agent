import { BaseMessage, TextMessage } from '@2060.io/model';
import { MessageHandler } from '@2060.io/nestjs-client';
import { ApiClient, ApiVersion } from '@2060.io/service-agent-client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CoreService implements MessageHandler {private readonly apiClient: ApiClient;

  constructor() {
    const baseUrl = process.env.SERVICE_AGENT_ADMIN_BASE_URL || '';
    const apiVersion = (process.env.API_VERSION as ApiVersion) || ApiVersion.V1;
    this.apiClient = new ApiClient(baseUrl, apiVersion);
  }

  async inputMessage(message: BaseMessage): Promise<void> {
    switch (message.type) {
      case TextMessage.type:
        await this.apiClient.messages.send(message)
        break
      default:
        break
    }
  }

}
