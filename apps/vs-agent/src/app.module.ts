import { DynamicModule, Module } from '@nestjs/common'

import {
  ConnectionController,
  CoreMessageService,
  CredentialTypesController,
  DidWebRoutesController,
  InvitationController,
  InvitationRoutesController,
  MessageController,
  MessageService,
  MessageServiceFactory,
  PresentationsController,
  QrController,
  RedisMessageService,
  SelfVtrController,
  SelfVtrService,
  VCAuthNController,
  VsAgentController,
} from './controllers'
import { HandledRedisModule } from './modules/redis.module'
import { UrlShorteningService } from './services/UrlShorteningService'
import { VsAgentService } from './services/VsAgentService'
import { VsAgent } from './utils/VsAgent'

@Module({})
export class VsAgentModule {
  static register(agent: VsAgent): DynamicModule {
    return {
      module: VsAgentModule,
      imports: [HandledRedisModule.forRoot()],
      controllers: [
        VsAgentController,
        ConnectionController,
        CredentialTypesController,
        MessageController,
        PresentationsController,
        InvitationController,
        QrController,
        VCAuthNController,
        InvitationRoutesController,
        SelfVtrController,
        DidWebRoutesController,
      ],
      providers: [
        {
          provide: 'VSAGENT',
          useValue: agent,
        },
        VsAgentService,
        UrlShorteningService,
        MessageService,
        RedisMessageService,
        CoreMessageService,
        MessageServiceFactory,
        SelfVtrService,
      ],
      exports: [VsAgentService],
    }
  }
}

export class AppModule {}
