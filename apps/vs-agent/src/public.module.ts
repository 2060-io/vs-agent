import { DynamicModule, Module } from '@nestjs/common'

import {
  DidWebController,
  InvitationRoutesController,
  SelfVtrController,
  SelfVtrService,
} from './controllers'
import { VsAgentService } from './services/VsAgentService'
import { VsAgent } from './utils/VsAgent'

@Module({})
export class PublicModule {
  static register(agent: VsAgent, publicApiBaseUrl: string): DynamicModule {
    return {
      module: PublicModule,
      imports: [],
      controllers: [InvitationRoutesController, SelfVtrController, DidWebController],
      providers: [
        {
          provide: 'VSAGENT',
          useValue: agent,
        },
        {
          provide: 'PUBLIC_API_BASE_URL',
          useValue: publicApiBaseUrl,
        },
        SelfVtrService,
        VsAgentService,
      ],
      exports: [],
    }
  }
}

export class AppModule {}
