import { Inject, Injectable } from '@nestjs/common'

import { VsAgent } from '../utils/VsAgent'

@Injectable()
export class AgentService {
  constructor(@Inject('AGENT') private agent: VsAgent) {}

  async getAgent(): Promise<VsAgent> {
    if (!this.agent.isInitialized) {
      await this.agent.initialize()
    }

    return this.agent
  }
}
