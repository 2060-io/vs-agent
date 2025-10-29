import { JsonTransformer, W3cJsonLdVerifiableCredential } from '@credo-ts/core'
import { Controller, Get, HttpException, HttpStatus, Logger, Post, Delete, Body, Param } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiParam } from '@nestjs/swagger'

import { TrustService } from './TrustService'
import { IssueCredentialRequestDto, JsonSchemaCredentialDto, W3cCredentialDto } from './dto'

@ApiTags('Verifiable Trust Credential')
@Controller('vt')
export class TrustController {
  private readonly logger = new Logger(TrustController.name)

  constructor(private readonly trustService: TrustService) {}

  @Get(':schemaId')
  @ApiOperation({
    summary: 'Get stored credentials (JSON Schema Credential or JSON-LD)',
    description:
      'Retrieves stored credential data by schema ID. This endpoint supports both JSON Schema Credentials and JSON-LD Verifiable Credentials.\n\n' +
      '- For ECS-based schemas: use IDs like `ecs-org-c-vp.json` or `ecs-service-c-vp.json`.\n' +
      '- For regular schemas: use IDs like `schemas-example-org-jsc.json`.\n\n' +
      'The schemaId identifies the schema used to locate the credential in the system.',
  })
  @ApiParam({
    name: 'schemaId',
    required: true,
    type: String,
    description:
      'Identifier of the stored credential schema. Examples: `ecs-org-c-vp.json`, `schemas-example-org-jsc.json`.',
    examples: {
      jsonLd: {
        value: 'ecs-org-c-vp.json',
        description: 'Example of a JSON-LD Verifiable Credential schema',
      },
      jsonSchema: {
        value: 'schemas-example-org-jsc.json',
        description: 'Example of a JSON Schema Credential schema',
      },
    },
  })
  @ApiResponse({ status: 200, description: 'List of credentials for the given schema ID' })
  @ApiResponse({ status: 404, description: 'Credential schema not found' })
  async getSchemaCredential(@Param('schemaId') schemaId: string) {
    // This endpoint retrieves stored data for both JSON Schema and JSON-LD credentials
    return await this.trustService.getSchemaData(schemaId)
  }

  @Delete(':schemaId')
  @ApiOperation({
    summary: 'Delete a stored credential schema (JSON Schema or JSON-LD)',
    description:
      'Removes a stored schema credential, which can be either a JSON Schema Credential or a JSON-LD Credential.',
  })
  @ApiParam({
    name: 'schemaId',
    required: true,
    type: String,
    description:
      'Identifier of the stored schema credential. For example: `ecs-org-c-vp.json` or `schemas-example-org-jsc.json`.',
    examples: {
      jsonSchema: {
        value: 'schemas-example-org-jsc.json',
        description: 'Example of a JSON Schema Credential',
      },
      jsonLd: {
        value: 'ecs-org-c-vp.json',
        description: 'Example of a JSON-LD Credential',
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Credential schema deleted successfully' })
  async removeCredential(@Param('schemaId') schemaId: string) {
    // This endpoint removes both JSON Schema credentials and JSON-LD credentials by ID
    return await this.trustService.removeSchemaData(schemaId)
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
          schemaBaseId: 'organization',
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
      body.schemaBaseId,
      JsonTransformer.fromJSON(body.credential, W3cJsonLdVerifiableCredential),
    )
    return { message: 'Credential updated', data }
  }

  /**
   * @summary Create or update a JSON Schema credential
   * @description
   * This endpoint creates or updates a JSON Schema credential identified by a unique `schemaBaseId`.
   * The `schemaBaseId` follows the convention `schemas-{schemaBaseId}-jsc.json`, where `{id}` represents
   * the schema's unique identifier.
   *
   * Example: `schemas-1234-jsc.json`
   *
   * The endpoint stores or updates the corresponding JSON Schema reference (`jsonSchemaRef`)
   */
  @Post('json-schema-credentials')
  @ApiOperation({ summary: 'Add a new JSON schema credential' })
  @ApiBody({
    type: JsonSchemaCredentialDto,
    examples: {
      service: {
        summary: 'JsonSchemaCredential Example',
        value: {
          schemaBaseId: 'example-service',
          jsonSchemaRef: 'vpr:verana:vna-testnet-1/cs/v1/js/12345678',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'JSON schema credential updated' })
  async updateJsonSchemaCredential(@Body() body: JsonSchemaCredentialDto) {
    return await this.trustService.updateJsonCredential(body.schemaBaseId, body.jsonSchemaRef)
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
