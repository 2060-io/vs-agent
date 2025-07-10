import { DynamicModule, Module } from '@nestjs/common'

import {
  DidWebRoutesController,
  InvitationRoutesController,
  SelfVtrController,
  SelfVtrService,
} from './controllers'
import { VsAgent } from './utils/VsAgent'
import { VsAgentService } from './services/VsAgentService'

@Module({})
export class DidCommModule {
  static register(agent: VsAgent): DynamicModule {
    return {
      module: DidCommModule,
      imports: [],
      controllers: [InvitationRoutesController, SelfVtrController, DidWebRoutesController],
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
