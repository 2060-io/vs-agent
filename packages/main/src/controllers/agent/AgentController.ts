import type { AgentInfo } from '@2060.io/vs-agent-model'

import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { AgentService } from '../../services/AgentService'

@ApiTags('agent')
@Controller({
  path: 'agent',
  version: '1',
})
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  /**
   * Retrieve basic agent information
   */
  @Get('/')
  public async getAgentInfo(): Promise<AgentInfo> {
    const agent = await this.agentService.getAgent()

    return {
      label: agent.config.label,
      endpoints: agent.config.endpoints,
      isInitialized: agent.isInitialized,
      publicDid: agent.did,
    }
  }
}
