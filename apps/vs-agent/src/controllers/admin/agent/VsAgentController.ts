import { JsonTransformer, W3cJsonLdVerifiableCredential } from '@credo-ts/core'
import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  getSchemaPath,
  ApiExtraModels,
  ApiBody,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger'

import { VsAgentService } from '../../../services/VsAgentService'
import { TrustService } from '../verifiable'

import { JsonSchemaCredentialDto, VsAgentInfoDto, W3cCredentialDto } from './dto'

@ApiTags('agent')
@ApiExtraModels(VsAgentInfoDto)
@Controller({ path: 'agent', version: '1' })
export class VsAgentController {
  constructor(
    private readonly vsAgentService: VsAgentService,
    private readonly trustService: TrustService,
  ) {}

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

  @Get('vtc')
  @ApiOperation({
    summary: 'Get stored credentials (JSON Schema Credential or JSON-LD)',
    description:
      'Retrieves stored credential data by schema ID. This endpoint supports both JSON Schema Credentials and JSON-LD Verifiable Credentials.\n\n' +
      '- For ECS-based schemas: use IDs like `ecs-org-c-vp.json` or `ecs-service-c-vp.json`.\n' +
      '- For regular schemas: use IDs like `schemas-example-org-jsc.json`.\n\n' +
      'The schemaId identifies the schema used to locate the credential in the system.',
  })
  @ApiQuery({
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
  async getSchemaCredential(@Query('schemaId') schemaId: string) {
    return await this.trustService.getVerifiableTrustCredential(schemaId)
  }

  @Delete('vtc')
  @ApiOperation({
    summary: 'Delete a stored credential schema (JSON Schema or JSON-LD)',
    description:
      'Removes a stored schema credential, which can be either a JSON Schema Credential or a JSON-LD Credential.',
  })
  @ApiQuery({
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
  async removeCredential(@Query('schemaId') schemaId: string) {
    return await this.trustService.removeVerifiableTrustCredential(schemaId)
  }

  @Post('vtc')
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
  async createCredential(@Body() body: W3cCredentialDto) {
    const data = await this.trustService.createSchemaData(
      body.schemaBaseId,
      JsonTransformer.fromJSON(body.credential, W3cJsonLdVerifiableCredential),
    )
    return { message: 'Credential updated', data }
  }

  @Get('jsc')
  @ApiOperation({
    summary: 'Get stored credentials (JSON Schema Credential or JSON-LD)',
    description:
      'Retrieves stored credential data by schema ID. This endpoint supports both JSON Schema Credentials and JSON-LD Verifiable Credentials.\n\n' +
      '- For ECS-based schemas: use IDs like `ecs-org-c-vp.json` or `ecs-service-c-vp.json`.\n' +
      '- For regular schemas: use IDs like `schemas-example-org-jsc.json`.\n\n' +
      'The schemaId identifies the schema used to locate the credential in the system.',
  })
  @ApiQuery({
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
  async getJsonSchemaCredential(@Query('schemaId') schemaId: string) {
    return await this.trustService.getJsonSchemaCredential(schemaId)
  }

  @Delete('jsc')
  @ApiOperation({
    summary: 'Delete a stored credential schema (JSON Schema or JSON-LD)',
    description:
      'Removes a stored schema credential, which can be either a JSON Schema Credential or a JSON-LD Credential.',
  })
  @ApiQuery({
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
  async removeJsonSchemaCredential(@Query('schemaId') schemaId: string) {
    return await this.trustService.removeJsonSchemaCredential(schemaId)
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
  @Post('jsc')
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
  async createJsonSchemaCredential(@Body() body: JsonSchemaCredentialDto) {
    return await this.trustService.createJsonCredential(body.schemaBaseId, body.jsonSchemaRef)
  }
}
