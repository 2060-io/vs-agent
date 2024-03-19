import { DynamicModule, Module } from '@nestjs/common'

import { AgentController } from './controllers/agent/AgentController'
import { ConnectionController } from './controllers/connections/ConnectionController'
import { CredentialTypesController } from './controllers/credentials/CredentialTypeController'
import { InvitationController } from './controllers/invitation/InvitationController'
import { QrController } from './controllers/invitation/QrController'
import { MessageController } from './controllers/message/MessageController'
import { AgentService } from './services/AgentService'
import { ServiceAgent } from './utils/ServiceAgent'

@Module({})
export class ServiceAgentModule {
  static register(agent: ServiceAgent): DynamicModule {
    return {
      module: ServiceAgentModule,
      controllers: [
        AgentController,
        ConnectionController,
        CredentialTypesController,
        MessageController,
        InvitationController,
        QrController,
      ],
      providers: [
        {
          provide: 'AGENT',
          useValue: agent,
        },
        AgentService,
      ],
      exports: [AgentService],
    }
  }
}

export class AppModule {}
