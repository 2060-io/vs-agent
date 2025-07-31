import { Controller, Get, Param, Query, HttpException, HttpStatus, Logger, Inject } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'

import { VsAgentService } from '../../../services/VsAgentService'
import { getEcsSchemas } from '../../../utils/data'

@ApiTags('Self Trust Registry')
@Controller('self-tr')
export class SelfTrController {
  private readonly logger = new Logger(SelfTrController.name)
  private ecsSchemas

  constructor(
    private readonly agentService: VsAgentService,
    @Inject('PUBLIC_API_BASE_URL') private readonly publicApiBaseUrl: string,
  ) {
    this.ecsSchemas = getEcsSchemas(publicApiBaseUrl)
  }

  @Get('ecs-service-c-vp.json')
  @ApiOperation({ summary: 'Get verifiable presentation for service' })
  @ApiResponse({ status: 200, description: 'Verifiable Presentation returned' })
  async getServiceVerifiablePresentation() {
    try {
      const agent = await this.agentService.getAgent()
      const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })
      console.log(didRecord.getTags())
      if (didRecord.getTag(`ecs-service`)) return JSON.parse(didRecord.getTag(`ecs-service`) as string)
    } catch (error) {
      this.logger.error(`Error loading schema file: ${error.message}`)
      throw new HttpException('Failed to load schema', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get('ecs-org-c-vp.json')
  @ApiOperation({ summary: 'Get verifiable presentation for organization' })
  @ApiResponse({ status: 200, description: 'Verifiable Presentation returned' })
  async getOrgVerifiablePresentation() {
    try {
      const agent = await this.agentService.getAgent()
      const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })
      if (didRecord.getTag(`ecs-org`)) return JSON.parse(didRecord.getTag(`ecs-org`) as string)
    } catch (error) {
      this.logger.error(`Error loading schema file: ${error.message}`)
      throw new HttpException('Failed to load schema', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get('schemas-example-service.json')
  @ApiOperation({ summary: 'Get verifiable credential for service' })
  @ApiResponse({ status: 200, description: 'Verifiable Credential returned' })
  async getServiceVerifiableCredential() {
    try {
      const agent = await this.agentService.getAgent()
      const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })
      if (didRecord.getTag(`example-service`))
        return JSON.parse(didRecord.getTag(`example-service`) as string)
    } catch (error) {
      this.logger.error(`Error loading schema file: ${error.message}`)
      throw new HttpException('Failed to load schema', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get('schemas-example-org.json')
  @ApiOperation({ summary: 'Get verifiable credential for organization' })
  @ApiResponse({ status: 200, description: 'Verifiable Credential returned' })
  async getOrgVerifiableCredential() {
    try {
      const agent = await this.agentService.getAgent()
      const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })
      if (didRecord.getTag(`example-org`)) return JSON.parse(didRecord.getTag(`example-org`) as string)
    } catch (error) {
      this.logger.error(`Error loading schema file: ${error.message}`)
      throw new HttpException('Failed to load schema', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  // GET Function to Retrieve JSON Schemas
  @Get('cs/v1/js/:schemaId')
  @ApiOperation({ summary: 'Get JSON schema by schemaId' })
  @ApiParam({ name: 'schemaId', required: true, description: 'Schema identifier', example: 'ecs-org' })
  @ApiResponse({ status: 200, description: 'JSON schema returned' })
  async getSchema(@Param('schemaId') schemaId: string) {
    try {
      if (!schemaId) {
        throw new HttpException('Schema not found', HttpStatus.NOT_FOUND)
      }
      const ecsSchema = this.ecsSchemas[schemaId]
      return {
        schema: JSON.stringify(ecsSchema),
      }
    } catch (error) {
      this.logger.error(`Error loading schema file: ${error.message}`)
      throw new HttpException('Failed to load schema', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get('perm/v1/find_with_did')
  @ApiOperation({ summary: 'Get type by DID' })
  @ApiQuery({ name: 'did', required: true, description: 'DID to query' })
  @ApiResponse({ status: 200, description: 'Type returned' })
  findWithDid(@Query('did') did: string) {
    if (!did) {
      throw new HttpException('Missing required "did" query parameter.', HttpStatus.BAD_REQUEST)
    }
    return { type: 'ISSUER' }
  }
}
