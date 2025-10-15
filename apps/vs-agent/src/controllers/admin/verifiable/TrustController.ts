import { JsonTransformer, W3cJsonLdVerifiableCredential } from '@credo-ts/core'
import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common'
import { ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiBody, getSchemaPath } from '@nestjs/swagger'

import { TrustService } from './TrustService'
import {
  IssueAnonCredsRequestDto,
  IssueCredentialWrapperDto,
  IssueW3cJsonLdRequestDto,
  JsonSchemaCredentialDto,
  W3cCredentialDto,
} from './dto'

@ApiTags('Verifiable Trust Credential')
@Controller('vt')
export class TrustController {
  private readonly logger = new Logger(TrustController.name)

  constructor(private readonly trustService: TrustService) {}

  @Get('credentials/:schemaId')
  @ApiOperation({ summary: 'Get all verifiable credentials' })
  @ApiResponse({ status: 200, description: 'List of credentials' })
  async getCredential(@Param('schemaId') schemaId: string) {
    try {
      return await this.trustService.getSchemaData(schemaId.toLowerCase(), 'Schema not found')
    } catch (error) {
      this.logger.error(`getCredentials: ${error.message}`)
      throw new HttpException('Failed to get credentials', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('credentials')
  @ApiOperation({
    summary: 'Add a new W3C Verifiable Credential (organization or service)',
    description:
      'Accepts a W3C Verifiable Credential following the JSON-LD data model. Supports both organization and service credentials.',
  })
  @ApiBody({
    type: W3cCredentialDto,
    examples: {
      organization: {
        summary: 'Organization Credential Example',
        description: 'Represents an organization using the "ecs-org" credential schema.',
        value: {
          credential: {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            id: 'https://example.org/credentials/123',
            type: ['VerifiableCredential', 'EcsOrgCredential'],
            issuer: 'did:example:issuer123',
            issuanceDate: '2025-10-13T12:00:00Z',
            credentialSubject: {
              id: 'did:example:org123',
              name: 'OpenAI Research',
              logo: 'https://example.com/logo.png',
              registryId: 'REG-123',
              registryUrl: 'https://registry.example.org',
              address: '123 Main St, San Francisco, CA',
              type: 'PRIVATE',
              countryCode: 'US',
            },
            proof: {
              type: 'Ed25519Signature2018',
              created: '2025-10-13T12:00:00Z',
              proofPurpose: 'assertionMethod',
              verificationMethod: 'did:example:issuer123#key-1',
              jws: 'eyJhbGciOiJFZERTQSJ9...',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Credential created successfully' })
  async updateCredential(@Body() body: W3cCredentialDto) {
    try {
      const data = await this.trustService.updateSchemaData(
        JsonTransformer.fromJSON(body.credential, W3cJsonLdVerifiableCredential),
      )
      return { message: 'Credential updated', data }
    } catch (error) {
      this.logger.error(`updateCredentials: ${error.message}`)
      throw new HttpException('Failed to update credential', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Delete('credentials')
  @ApiOperation({ summary: 'Delete a verifiable credential' })
  @ApiQuery({
    name: 'id',
    required: true,
    type: String,
    description: 'ID of the credential to delete',
    examples: {
      service: { value: 'ecs-service', description: 'Example for ECS Service credential' },
      org: { value: 'ecs-org', description: 'Example for ECS Organization credential' },
    },
  })
  @ApiResponse({ status: 200, description: 'Credential deleted' })
  async removeCredential(@Query('id') id: string) {
    try {
      return await this.trustService.removeSchemaData(id.toLowerCase())
    } catch (error) {
      this.logger.error(`removeCredentials: ${error.message}`)
      throw new HttpException('Failed to delete credential', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get('json-schema-credentials/:schemaId')
  @ApiOperation({ summary: 'Get all JSON schema credentials' })
  @ApiResponse({ status: 200, description: 'List of JSON schema credentials' })
  async getJsonSchemaCredentials(@Param('schemaId') schemaId: string) {
    try {
      return await this.trustService.getJsonCredential(schemaId)
    } catch (error) {
      this.logger.error(`getJsonSchemaCredentials: ${error.message}`)
      throw new HttpException('Failed to get JSON schema credentials', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('json-schema-credentials')
  @ApiOperation({ summary: 'Add a new JSON schema credential' })
  @ApiBody({
    type: JsonSchemaCredentialDto,
    examples: {
      service: {
        summary: 'JsonSchemaCredential Example',
        value: {
          schemaId: 'example-service',
          jsonSchemaRef: 'vpr:verana:mainnet/cs/v1/js/12345678',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'JSON schema credential updated' })
  async updateJsonSchemaCredential(@Body() body: JsonSchemaCredentialDto) {
    try {
      return await this.trustService.updateJsonCredential(body.schemaId, body.jsonSchemaRef)
    } catch (error) {
      this.logger.error(`createJsonSchemaCredential: ${error.message}`)
      throw new HttpException('Failed to create JSON schema credential', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Delete('json-schema-credentials/:schemaId')
  @ApiOperation({ summary: 'Delete a JSON schema credential' })
  @ApiQuery({ name: 'id', required: true, type: String })
  @ApiResponse({ status: 200, description: 'JSON schema credential deleted' })
  async removeJsonSchemaCredential(@Param('schemaId') schemaId: string) {
    try {
      return await this.trustService.removeJsonCredential(schemaId)
    } catch (error) {
      this.logger.error(`removeJsonSchemaCredential: ${error.message}`)
      throw new HttpException('Failed to delete JSON schema credential', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('issue-credential')
  @ApiOperation({ summary: 'Issue a new verifiable credential' })
  @ApiBody({
    type: IssueCredentialWrapperDto,
    examples: {
      jsonld: {
        summary: 'W3c Json LD Credential Example',
        value: {
          type: 'jsonld',
          credential: {
            did: 'did:web:example.com',
            jsonSchemaCredential: 'https://example.org/vt/schemas-example-service-jsc.json',
            claims: {
              id: 'https://example.org/org/123',
              name: 'OpenAI Research',
              logo: 'https://example.com/logo.png',
              registryId: 'REG-123',
              registryUrl: 'https://registry.example.org',
              address: '123 Main St, San Francisco, CA',
              type: 'PRIVATE',
              countryCode: 'US',
            },
          },
        },
      },
      anoncreds: {
        summary: 'Anoncreds Credential Example',
        value: {
          type: 'anoncreds',
          credential: {
            did: 'did:web:example.com',
            jsonSchema: 'https://example.org/vt/schemas-example-service-jsc.json',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Credential issued' })
  async issueCredential(@Body() body: IssueCredentialWrapperDto) {
    try {
      const { type, credential } = body
      switch (type) {
        case 'jsonld':
          const jsonld = credential as IssueW3cJsonLdRequestDto
          return await this.trustService.issueW3cJsonLd(
            jsonld.did,
            jsonld.jsonSchemaCredential,
            jsonld.claims,
          )
        case 'anoncreds':
          const anoncreds = credential as IssueAnonCredsRequestDto
          return await this.trustService.issueAnoncreds(anoncreds.did, anoncreds.jsonSchema)
        default:
          throw new HttpException(`Unsupported credential type: ${type}`, HttpStatus.BAD_REQUEST)
      }
    } catch (error) {
      this.logger.error(`issueCredential: ${error.message}`)
      throw new HttpException('Failed to issue credential', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('revoke-credential')
  @ApiOperation({ summary: 'Revoke a verifiable credential' })
  @ApiBody({ schema: { example: { id: 'cred-1' } } })
  @ApiResponse({ status: 200, description: 'Credential revoked' })
  async revokeCredential() {
    try {
      throw new HttpException({ message: `This method is not implemented yet` }, HttpStatus.NOT_IMPLEMENTED)
    } catch (error) {
      this.logger.error(`revokeCredential: ${error.message}`)
      throw new HttpException('Failed to revoke credential', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
