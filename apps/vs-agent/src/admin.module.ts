import { DynamicModule, Module } from '@nestjs/common'

import {
  ConnectionController,
  CoreMessageService,
  CredentialTypesController,
  HealthController,
  InvitationController,
  MessageController,
  MessageService,
  MessageServiceFactory,
  PresentationsController,
  QrController,
  RedisMessageService,
  VCAuthNController,
  VsAgentController,
} from './controllers'
import { HandledRedisModule } from './modules/redis.module'
import { UrlShorteningService } from './services/UrlShorteningService'
import { VsAgentService } from './services/VsAgentService'
import { VsAgent } from './utils/VsAgent'

@Module({})
export class VsAgentModule {
  static register(agent: VsAgent, publicApiBaseUrl: string): DynamicModule {
    return {
      module: VsAgentModule,
      imports: [HandledRedisModule.forRoot()],
      controllers: [
        VsAgentController,
        ConnectionController,
        CredentialTypesController,
        HealthController,
        MessageController,
        PresentationsController,
        InvitationController,
        QrController,
        VCAuthNController,
      ],
      providers: [
        {
          provide: 'VSAGENT',
          useValue: agent,
        },
        {
          provide: 'PUBLIC_API_BASE_URL',
          useValue: publicApiBaseUrl,
        },
        VsAgentService,
        UrlShorteningService,
        MessageService,
        RedisMessageService,
        CoreMessageService,
        MessageServiceFactory,
      ],
      exports: [VsAgentService],
    }
  }
}
