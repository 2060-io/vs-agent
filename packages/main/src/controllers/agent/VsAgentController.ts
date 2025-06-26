import type { VsAgentInfo } from '@2060.io/vs-agent-model'

import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { VsAgentService } from '../../services/VsAgentService'

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
  @ApiOperation({
    summary: 'Get agent information',
    description:
      'Returns basic metadata about the current agent instance, including label, endpoints, initialization status, and public DID if available.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent metadata successfully retrieved.',
    schema: {
      type: 'object',
      properties: {
        label: { type: 'string', example: 'agent-123' },
        endpoints: {
          type: 'array',
          items: { type: 'string' },
          example: ['http://localhost:3000'],
        },
        isInitialized: { type: 'boolean', example: true },
        publicDid: { type: 'string', nullable: true, example: 'did:web:1234' },
      },
    },
  })
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
