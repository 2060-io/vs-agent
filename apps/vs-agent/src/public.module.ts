import { DynamicModule, Module } from '@nestjs/common'

import { DidWebController, InvitationRoutesController, SelfTrController, TrustService } from './controllers'
import { UrlShorteningService } from './services'
import { VsAgentService } from './services/VsAgentService'
import { VsAgent } from './utils'

@Module({})
export class PublicModule {
  static register(agent: VsAgent, publicApiBaseUrl: string): DynamicModule {
    return {
      module: PublicModule,
      imports: [],
      controllers: [InvitationRoutesController, SelfTrController, DidWebController],
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
        TrustService,
        UrlShorteningService,
      ],
      exports: [],
    }
  }
}
