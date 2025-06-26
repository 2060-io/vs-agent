import { DynamicModule, Module } from '@nestjs/common'

import { VsAgentController } from './controllers/agent/VsAgentController'
import { ConnectionController } from './controllers/connections/ConnectionController'
import { CredentialTypesController } from './controllers/credentials/CredentialTypeController'
import { InvitationController } from './controllers/invitation/InvitationController'
import { QrController } from './controllers/invitation/QrController'
import {
  CoreMessageService,
  MessageService,
  MessageServiceFactory,
  RedisMessageService,
} from './controllers/message'
import { MessageController } from './controllers/message/MessageController'
import { PresentationsController } from './controllers/presentations/PresentationsController'
import { VCAuthNController } from './controllers/vcauthn/VCAuthNController'
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
      ],
      exports: [VsAgentService],
    }
  }
}

export class AppModule {}
