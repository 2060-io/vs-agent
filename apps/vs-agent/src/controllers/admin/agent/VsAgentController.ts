import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiOkResponse, getSchemaPath, ApiExtraModels } from '@nestjs/swagger'

import { VsAgentService } from '../../../services/VsAgentService'
import { VsAgentInfoDto } from './dto/vs-agent-info.dto'

@ApiTags('agent')
@ApiExtraModels(VsAgentInfoDto)
@Controller({ path: 'agent', version: '1' })
export class VsAgentController {
  constructor(private readonly vsAgentService: VsAgentService) {}

  @Get('/')
  @ApiOperation({
    summary: 'Get vs-agent information',
    description:
      'Returns the core configuration and status of this VS Agent instance, including the user-facing label, available endpoints, initialization state, and public DID (if set).',
  })
  @ApiOkResponse({
    description: 'Agent information retrieved successfully',
    schema: { $ref: getSchemaPath(VsAgentInfoDto) },
  })
  public async getAgentInfo(): Promise<VsAgentInfoDto> {
    const vsAgent = await this.vsAgentService.getAgent()
    return {
      label: vsAgent.config.label,
      endpoints: vsAgent.config.endpoints,
      isInitialized: vsAgent.isInitialized,
      publicDid: vsAgent.did,
    }
  }
}
