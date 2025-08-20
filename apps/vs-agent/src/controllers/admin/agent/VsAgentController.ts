import type { VsAgentInfo } from '@2060.io/vs-agent-model'

import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { VsAgentService } from '../../../services/VsAgentService'

@ApiTags('agent')
@Controller({
  path: 'agent',
  version: '1',
})
export class VsAgentController {
  constructor(private readonly vsAgentService: VsAgentService) {}

  /**
   * Retrieve basic agent information
   */
  @Get('/')
  public async getAgentInfo(): Promise<VsAgentInfo> {
    const vsAgent = await this.vsAgentService.getAgent()

    return {
      label: vsAgent.config.label,
      endpoints: vsAgent.config.endpoints,
      isInitialized: vsAgent.isInitialized,
      publicDid: vsAgent.did,
    }
  }
}
