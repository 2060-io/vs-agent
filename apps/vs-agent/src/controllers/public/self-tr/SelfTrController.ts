import { Controller, Get, Param, Query, HttpException, HttpStatus, Logger, Inject } from '@nestjs/common'

import { SelfVtrService } from './SelfTrService'

@Controller('self-tr')
export class SelfVtrController {
  private readonly logger = new Logger(SelfVtrController.name)

  constructor(
    private readonly service: SelfVtrService,
    @Inject('PUBLIC_API_BASE_URL') private readonly publicApiBaseUrl: string,
  ) {}

  @Get('ecs-service-c-vp.json')
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
  findWithDid(@Query('did') did: string) {
    if (!did) {
      throw new HttpException('Missing required "did" query parameter.', HttpStatus.BAD_REQUEST)
    }
    return { type: 'ISSUER' }
  }
}
