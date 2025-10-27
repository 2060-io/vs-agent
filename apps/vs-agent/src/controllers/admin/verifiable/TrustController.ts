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
import { ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger'

import { TrustService } from './TrustService'
import { IssueCredentialRequestDto, JsonSchemaCredentialDto, W3cCredentialDto } from './dto'

@ApiTags('Verifiable Trust Credential')
@Controller('vt')
export class TrustController {
  private readonly logger = new Logger(TrustController.name)

  constructor(private readonly trustService: TrustService) {}

  @Get('credentials/:schemaId')
  @ApiOperation({
    summary: 'Get all verifiable credentials',
    description:
      'Based on the specification, the schemaId must follow one of the ECS or schema formats: ' +
      '- For ECS schemas, use ecs-{schemaType} (e.g., ecs-service, ecs-org). ' +
      '- For regular schemas, use schemas-{schemaType}, where {schemaType} matches the "type" field of the credential.',
  })
  @ApiResponse({ status: 200, description: 'List of credentials' })
  async getCredential(@Param('schemaId') schemaId: string) {
    return await this.trustService.getSchemaData(schemaId.toLowerCase(), 'Schema not found')
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
    const data = await this.trustService.updateSchemaData(
      JsonTransformer.fromJSON(body.credential, W3cJsonLdVerifiableCredential),
    )
    return { message: 'Credential updated', data }
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
    return await this.trustService.removeSchemaData(id.toLowerCase())
  }

  @Get('json-schema-credentials/:schemaId')
  @ApiOperation({
    summary: 'Get all JSON schema credentials',
    description:
      'The schemaId indicates the schema used to locate the credential in the system. ' +
      'It typically follows the structure https://schemaurl.com/vt/schemas-{schemaId}-jsc.json, ' +
      'where {schemaId} corresponds to the schema identifier.',
  })
  @ApiResponse({ status: 200, description: 'List of JSON schema credentials' })
  async getJsonSchemaCredentials(@Param('schemaId') schemaId: string) {
    return await this.trustService.getJsonCredential(schemaId)
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
          jsonSchemaRef: 'vpr:verana:vna-testnet-1/cs/v1/js/12345678',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'JSON schema credential updated' })
  async updateJsonSchemaCredential(@Body() body: JsonSchemaCredentialDto) {
    return await this.trustService.updateJsonCredential(body.schemaId, body.jsonSchemaRef)
  }

  @Delete('json-schema-credentials/:schemaId')
  @ApiOperation({ summary: 'Delete a JSON schema credential' })
  @ApiQuery({ name: 'id', required: true, type: String })
  @ApiResponse({ status: 200, description: 'JSON schema credential deleted' })
  async removeJsonSchemaCredential(@Param('schemaId') schemaId: string) {
    return await this.trustService.removeJsonCredential(schemaId)
  }

  @Post('issue-credential')
  @ApiOperation({ summary: 'Issue a new verifiable credential' })
  @ApiBody({
    type: IssueCredentialRequestDto,
    examples: {
      jsonld: {
        summary: 'W3c Json LD Credential Example',
        value: {
          type: 'jsonld',
          did: 'did:web:example.com',
          jsonSchemaCredential: 'https://example.org/vt/schemas-example-org-jsc.json',
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
      anoncreds: {
        summary: 'Anoncreds Credential Example',
        value: {
          type: 'anoncreds',
          jsonSchemaCredential: 'https://example.org/vt/schemas-example-org-jsc.json',
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
  })
  @ApiResponse({
    status: 201,
    description:
      'Credential issued. The response is either a W3C Verifiable Credential (JSON-LD) or a Credential Exchange ID.',
  })
  async issueCredential(@Body() body: IssueCredentialRequestDto) {
    const { type, did, jsonSchemaCredential, claims } = body
    return await this.trustService.issueCredential(type, jsonSchemaCredential, claims, did)
  }

  @Post('revoke-credential')
  @ApiOperation({ summary: 'Revoke a verifiable credential' })
  @ApiBody({ schema: { example: { id: 'cred-1' } } })
  @ApiResponse({ status: 200, description: 'Credential revoked' })
  async revokeCredential() {
    throw new HttpException({ message: `This method is not implemented yet` }, HttpStatus.NOT_IMPLEMENTED)
  }
}
