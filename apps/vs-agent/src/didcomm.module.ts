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
export class DidCommModule {
  static register(agent: VsAgent): DynamicModule {
    return {
      module: DidCommModule,
      imports: [],
      controllers: [InvitationRoutesController, SelfVtrController, DidWebController],
      providers: [
        {
          provide: 'VSAGENT',
          useValue: agent,
        },
        SelfVtrService,
        VsAgentService,
      ],
      exports: [],
    }
  }
}

export class AppModule {}
