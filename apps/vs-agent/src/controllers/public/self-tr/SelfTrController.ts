import { Controller, Get, Param, Query, HttpException, HttpStatus, Logger, Inject } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'

import { SelfVtrService } from './SelfTrService'

@ApiTags('Self Trust Registry')
@Controller('self-tr')
export class SelfTrController {
  private readonly logger = new Logger(SelfVtrController.name)

  constructor(
    private readonly service: SelfVtrService,
    @Inject('PUBLIC_API_BASE_URL') private readonly publicApiBaseUrl: string,
  ) {}

  @Get('ecs-service-c-vp.json')
  @ApiOperation({ summary: 'Get verifiable presentation for service' })
  @ApiResponse({ status: 200, description: 'Verifiable Presentation returned' })
  async getServiceVerifiablePresentation() {
    try {
      return await this.service.generateVerifiablePresentation(
        'ecs-service',
        ['VerifiableCredential', 'VerifiableTrustCredential'],
        {
          id: `${this.publicApiBaseUrl}/self-tr/schemas-example-service.json`,
          type: 'JsonSchemaCredential',
        },
      )
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
      return await this.service.generateVerifiablePresentation(
        'ecs-org',
        ['VerifiableCredential', 'VerifiableTrustCredential'],
        {
          id: `${this.publicApiBaseUrl}/self-tr/schemas-example-org.json`,
          type: 'JsonSchemaCredential',
        },
      )
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
      return await this.service.generateVerifiableCredential(
        'ECS SERVICE',
        ['VerifiableCredential', 'JsonSchemaCredential'],
        {
          id: `${this.publicApiBaseUrl}/self-tr/cs/v1/js/ecs-service`,
          claims: {
            type: 'JsonSchema',
            jsonSchema: {
              $ref: `${this.publicApiBaseUrl}/self-tr/cs/v1/js/ecs-service`,
            },
          },
        },
        {
          id: 'https://www.w3.org/ns/credentials/json-schema/v2.json',
          type: 'JsonSchema',
        },
      )
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
      return await this.service.generateVerifiableCredential(
        'ECS ORG',
        ['VerifiableCredential', 'VerifiableTrustCredential'],
        {
          id: `${this.publicApiBaseUrl}/self-tr/cs/v1/js/ecs-org`,
          claims: {
            type: 'JsonSchema',
            jsonSchema: {
              $ref: `${this.publicApiBaseUrl}/self-tr/cs/v1/js/ecs-org`,
            },
          },
        },
        {
          id: 'https://www.w3.org/ns/credentials/json-schema/v2.json',
          type: 'JsonSchema',
        },
      )
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
      const ecsSchema = this.service.getSchemas(schemaId)
      return {
        id: 101,
        tr_id: 1002,
        created: '2024-03-12T12:00:00Z',
        modified: '2024-03-12T12:30:00Z',
        archived: '',
        deposit: 5000,
        json_schema: JSON.stringify(ecsSchema),
        issuer_grantor_validation_validity_period: 365,
        verifier_grantor_validation_validity_period: 180,
        issuer_validation_validity_period: 730,
        verifier_validation_validity_period: 90,
        holder_validation_validity_period: 60,
        issuer_perm_management_mode: 'STRICT',
        verifier_perm_management_mode: 'FLEXIBLE',
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
