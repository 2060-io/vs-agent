import { Inject, Injectable } from '@nestjs/common'

import { ServiceAgent } from '../utils/ServiceAgent'

@Injectable()
export class AgentService {
  constructor(@Inject('AGENT') private agent: ServiceAgent) {}

  async getAgent(): Promise<ServiceAgent> {
    if (!this.agent.isInitialized) {
      await this.agent.initialize()
    }

    return this.agent
  }
}
