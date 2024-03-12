import { DynamicModule, Module } from '@nestjs/common';
import { ConnectionController } from './controllers/connections/ConnectionController';
import { CredentialTypesController } from './controllers/credentials/CredentialTypeController';
import { MessageController } from './controllers/message/MessageController';
import { InvitationController } from './controllers/invitation/InvitationController';
import { QrController } from './controllers/invitation/QrController';
import { AgentService } from './services/AgentService';
import { ServiceAgent } from './utils/ServiceAgent';
import { AgentController } from './controllers/agent/AgentController';

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
        QrController
          ],
      providers: [
        {
          provide: "AGENT",
          useValue: agent,
        },
        AgentService,
      ],
      exports: [AgentService],
    }
  }
}

export class AppModule {}
