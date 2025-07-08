import { Body, Controller, HttpException, HttpStatus, Logger, Param, Post } from '@nestjs/common'
import { ApiBody, ApiParam, ApiTags, getSchemaPath } from '@nestjs/swagger'
import { instanceToPlain } from 'class-transformer'

import { VsAgentService } from '../../services/VsAgentService'

import {
  OrganizationCredentialDto,
  PersonCredentialDto,
  ServiceCredentialDto,
  UserAgentCredentialDto,
} from './selfVtrDto'

type CredentialVtrDto =
  | OrganizationCredentialDto
  | PersonCredentialDto
  | ServiceCredentialDto
  | UserAgentCredentialDto

/**
 * POST /upload/:schemaId
 *
 * Upload and validate credential data against the JSON schema defined in selfVtrDto.
 *
 * Usage:
 *   - :schemaId must be either "ecs-service" or "ecs-org" (as defined in selfVtrDto).
 *   - The request body should be a JSON object matching the schema at selfVtrDto > [schemaId] > properties > credentialSubject.
 *   - The "id" field is automatically set to the agent's DID.
 *
 * Example using curl:
 *
 *   curl -X POST http://localhost:3000/upload/ecs-service \
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
 *   - 404 Not Found: schemaId does not exist.
 *   - 500 Internal Server Error: Unexpected error.
 */
@ApiTags('self-vtr')
@Controller({
  path: 'self-vtr',
  version: '1',
})
export class SelfVtrController {
  private readonly logger = new Logger(SelfVtrController.name)

  constructor(private readonly agentService: VsAgentService) {}

  @Post('/upload/:schemaId')
  @ApiParam({
    name: 'schemaId',
    enum: ['ecs-org', 'ecs-person', 'ecs-service', 'ecs-user-agent'],
  })
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(OrganizationCredentialDto) },
        { $ref: getSchemaPath(PersonCredentialDto) },
        { $ref: getSchemaPath(ServiceCredentialDto) },
        { $ref: getSchemaPath(UserAgentCredentialDto) },
      ],
    },
  })
  public async uploadSchemaData(@Param('schemaId') schemaId: string, @Body() body: CredentialVtrDto) {
    const allowedSchemas = ['ecs-org', 'ecs-person', 'ecs-service', 'ecs-user-agent']

    if (!allowedSchemas.includes(schemaId)) {
      throw new HttpException('Unsupported schemaId', HttpStatus.BAD_REQUEST)
    }

    try {
      const agent = await this.agentService.getAgent()
      const recordId = `${agent.did}-${schemaId}`

      try {
        const existing = await agent.genericRecords.findById(recordId)
        if (existing) {
          await agent.genericRecords.delete(existing)
        }
      } catch (e) {
        this.logger.debug(`No existing record for ${recordId}`)
      }

      await agent.genericRecords.save({
        id: recordId,
        content: instanceToPlain(body),
      })

      return {
        message: 'Data is valid and accepted',
      }
    } catch (error) {
      this.logger.error(`Failed to process upload: ${error.message}`, error.stack)
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
