import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus, Logger } from '@nestjs/common'
import Ajv from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import * as fs from 'fs'
import * as path from 'path'

import { PUBLIC_API_BASE_URL } from '../../../config/constants'
import { VsAgentService } from '../../../services/VsAgentService'

import { SelfVtrService } from './SelfVtrService'

const ecsSchemas = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'data.json'), 'utf-8'))
const ajv = new Ajv({ strict: false })
addFormats(ajv)

@Controller('self-vtr')
export class SelfVtrController {
  private readonly logger = new Logger(SelfVtrController.name)

  constructor(
    private readonly agentService: VsAgentService,
    private readonly service: SelfVtrService,
  ) {}

  @Get('ecs-service-c-vp.json')
  async getServiceVerifiablePresentation() {
    try {
      return await this.service.generateVerifiablePresentation(
        'ecs-service',
        ['VerifiableCredential', 'VerifiableTrustCredential'],
        {
          id: `${PUBLIC_API_BASE_URL}/self-vtr/schemas-example-service.json`,
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
          id: `${PUBLIC_API_BASE_URL}/self-vtr/schemas-example-org.json`,
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
          id: `${PUBLIC_API_BASE_URL}/self-vtr/cs/v1/js/ecs-service`,
          claims: {
            type: 'JsonSchema',
            jsonSchema: {
              $ref: `${PUBLIC_API_BASE_URL}/self-vtr/cs/v1/js/ecs-service`,
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
          id: `${PUBLIC_API_BASE_URL}/self-vtr/cs/v1/js/ecs-org`,
          claims: {
            type: 'JsonSchema',
            jsonSchema: {
              $ref: `${PUBLIC_API_BASE_URL}/self-vtr/cs/v1/js/ecs-org`,
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
      const ecsSchema = ecsSchemas[schemaId]
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

  /**
   * POST /upload/:schemaId
   *
   * Upload and validate credential data against the JSON schema defined in data.json.
   *
   * Usage:
   *   - :schemaId must be either "ecs-service" or "ecs-org" (as defined in data.json).
   *   - The request body should be a JSON object matching the schema at data.json > [schemaId] > properties > credentialSubject.
   *   - The "id" field is automatically set to the agent's DID.
   *
   * Example using curl:
   *
   *   curl -X POST http://localhost:3001/upload/ecs-service \
   *     -H "Content-Type: application/json" \
   *     -d '{
   *       "name": "Health Portal",
   *       "type": "WEB_PORTAL",
   *       "description": "Some description",
   *       "logo": "base64string",
   *       "minimumAgeRequired": 18,
   *       "termsAndConditions": "https://example.com/terms",
   *       "termsAndConditionsHash": "hash",
   *       "privacyPolicy": "https://example.com/privacy",
   *       "privacyPolicyHash": "hash"
   *     }'
   *
   * Responses:
   *   - 200 OK: Data is valid and accepted.
   *   - 400 Bad Request: Data is invalid according to the schema.
   *   - 404 Not Found: schemaId does not exist in data.json.
   *   - 500 Internal Server Error: Unexpected error.
   */
  @Post('upload/:schemaId')
  async upload(@Param('schemaId') schemaId: string, @Body() body: any) {
    const agent = await this.agentService.getAgent()
    const ecsSchema = ecsSchemas[schemaId]
    try {
      if (!ecsSchema) {
        throw new HttpException('Schema not defined in data.json', HttpStatus.NOT_FOUND)
      }
      const validate = ajv.compile(ecsSchema.properties.credentialSubject)
      const isValid = validate({ ...body, id: agent.did })
      if (!isValid) {
        throw new HttpException(
          {
            error: 'Invalid data',
            details: validate.errors?.map(e => ({
              message: e.message,
              path: e.instancePath,
              keyword: e.keyword,
              params: e.params,
            })),
          },
          HttpStatus.BAD_REQUEST,
        )
      }
      const recordId = `${agent.did}-${schemaId}`
      try {
        const existing = await agent.genericRecords.findById(recordId)
        if (existing) {
          await agent.genericRecords.delete(existing)
        }
      } catch (err) {}
      await agent.genericRecords.save({
        id: recordId,
        content: body,
      })
      return { message: 'Data is valid and accepted' }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR)
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
