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
    summary: 'Retrieve a Verifiable Trust Credential (VTC)',
    description:
      'Retrieves a Verifiable Trust Credential (VTC) based on the provided credential schema ID. ' +
      'The schema defines the structure and semantics of the verifiable credential. ' +
      'This endpoint follows the [Verifiable Trust Specification](https://verana-labs.github.io/verifiable-trust-spec/#vt-linked-vp-verifiable-trust-credential-linked-vp).',
  })
  @ApiQuery({
    name: 'schemaId',
    required: true,
    type: String,
    description:
      'The identifier of the stored credential schema. This ID specifies which Verifiable Credential schema should be used to generate or retrieve the corresponding Verifiable Trust Credential (VTC).',
    examples: {
      verifiableTrustCredential: {
        summary: 'JSON Schema Credential example',
        description: 'A full URL to the Verifiable Trust Credential.',
        value: 'https://p2801.ovpndev.mobiera.io/vt/ecs-service-c-vp.json',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Successfully retrieved the Verifiable Trust Credential (VTC) defined by the given JSON Schema URL.',
  })
  @ApiResponse({ status: 404, description: 'Schema not found.' })
  async getVerifiableTrustCredential(@Query('schemaId') schemaId: string) {
    return await this.trustService.getVerifiableTrustCredential(schemaId)
  }

  @Delete('vtc')
  @ApiOperation({
    summary: 'Delete a Verifiable Trust Credential (VTC)',
    description:
      'Deletes a stored Verifiable Trust Credential (VTC) associated with the specified JSON Schema credential. ' +
      'This operation removes the credential definition or cached data linked to the provided schema. ' +
      'The operation aligns with the [Verifiable Trust Specification](https://verana-labs.github.io/verifiable-trust-spec/#vt-linked-vp-verifiable-trust-credential-linked-vp).',
  })
  @ApiQuery({
    name: 'schemaId',
    required: true,
    type: String,
    description:
      'The URL of the Verifiable Trust Credential (VTC) to be deleted. ' +
      'This identifier must match an existing stored credential schema.',
    examples: {
      verifiableTrustCredential: {
        summary: 'JSON Schema Credential example',
        description: 'A full URL identifying the Verifiable Trust Credential to be deleted.',
        value: 'https://p2801.ovpndev.mobiera.io/vt/ecs-service-c-vp.json',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'The Verifiable Trust Credential (VTC) was successfully deleted for the given schema ID.',
  })
  @ApiResponse({
    status: 404,
    description: 'No Verifiable Trust Credential (VTC) was found for the provided schema ID.',
  })
  async removeVerifiableTrustCredential(@Query('schemaId') schemaId: string) {
    return await this.trustService.removeVerifiableTrustCredential(schemaId)
  }

  @Post('vtc')
  @ApiOperation({
    summary: 'Create a new Verifiable Trust Credential (VTC)',
    description:
      'The `schemaBaseId` defines the base name used to construct the resulting credential schema URL. ' +
      'This operation supports creating credentials for both organizations and services following the Verifiable Trust model.',
  })
  @ApiBody({
    type: W3cCredentialDto,
    description:
      'Defines the Verifiable Credential (VTC) to be created. ' +
      'The `schemaBaseId` determines the schema URL structure, and the `credential` field contains the W3C Verifiable Credential data.',
    examples: {
      organization: {
        summary: 'Organization Credential Example',
        description:
          'Creates a Verifiable Trust Credential (VTC) for an organization. ' +
          'The `schemaBaseId` is used to generate the schema URL (e.g., `https://p2801.ovpndev.mobiera.io/vt/schemas-organization-c-vp.json`).',
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
  @ApiResponse({
    status: 201,
    description:
      'The Verifiable Trust Credential (VTC) was successfully created and stored. ' +
      'The resulting schema URL is derived from the provided `schemaBaseId`.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid credential format or missing required fields.',
  })
  async createVtc(@Body() body: W3cCredentialDto) {
    const data = await this.trustService.createVtc(
      body.schemaBaseId.toLocaleLowerCase(),
      JsonTransformer.fromJSON(body.credential, W3cJsonLdVerifiableCredential),
    )
    return { message: 'Credential created successfully', data }
  }

  @Get('jsc')
  @ApiOperation({
    summary: 'Retrieve a JSON Schema Credential (JSC)',
    description:
      'Retrieves a JSON Schema Credential (JSC) associated with the given schema identifier (`schemaId`). ' +
      'A JSON Schema Credential defines the structure, types, and validation rules for a corresponding Verifiable Trust Credential (VTC). ' +
      'This endpoint follows the [Verifiable Trust Specification](https://verana-labs.github.io/verifiable-trust-spec/#json-schema-credentials).',
  })
  @ApiQuery({
    name: 'schemaId',
    required: true,
    type: String,
    description:
      'The identifier or URL of the JSON Schema Credential (JSC) to retrieve. ' +
      'This schema describes the structure of the Verifiable Trust Credential (VTC) it governs.',
    examples: {
      jsonSchemaCredential: {
        summary: 'JSON Schema Credential example',
        description: 'A full URL referencing the JSON Schema Credential to be retrieved.',
        value: 'https://ecosystem/shemas-example-jsc.json',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Successfully retrieved the JSON Schema Credential (JSC) associated with the given schema ID.',
  })
  @ApiResponse({
    status: 404,
    description: 'No JSON Schema Credential (JSC) was found for the provided schema ID.',
  })
  async getJsonSchemaCredential(@Query('schemaId') schemaId: string) {
    return await this.trustService.getJsonSchemaCredential(schemaId)
  }

  @Delete('jsc')
  @ApiOperation({
    summary: 'Delete a JSON Schema Credential (JSC)',
    description:
      'Deletes a stored JSON Schema Credential (JSC) associated with the specified schema identifier (`schemaId`). ' +
      'A JSON Schema Credential defines the structure and validation rules for a Verifiable Trust Credential (VTC). ' +
      'Removing a JSC also invalidates any Verifiable Trust Credentials that rely on it. ' +
      'This operation follows the [Verifiable Trust Specification](https://verana-labs.github.io/verifiable-trust-spec/#json-schema-credentials).',
  })
  @ApiQuery({
    name: 'schemaId',
    required: true,
    type: String,
    description:
      'The identifier or URL of the JSON Schema Credential (JSC) to delete. ' +
      'This must correspond to an existing stored schema definition.',
    examples: {
      jsonSchemaCredential: {
        summary: 'JSON Schema Credential example',
        description: 'A full URL identifying the JSON Schema Credential (JSC) to be deleted.',
        value: 'https://ecosystem/shemas-example-jsc.json',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'The JSON Schema Credential (JSC) was successfully deleted for the given schema ID.',
  })
  @ApiResponse({
    status: 404,
    description: 'No JSON Schema Credential (JSC) was found for the provided schema ID.',
  })
  async removeJsonSchemaCredential(@Query('schemaId') schemaId: string) {
    return await this.trustService.removeJsonSchemaCredential(schemaId)
  }

  @Post('jsc')
  @ApiOperation({
    summary: 'Create or update a JSON Schema Credential (JSC)',
    description:
      'Creates or updates a JSON Schema Credential (JSC) based on the provided schema base identifier (`schemaBaseId`) and JSON Schema reference (`jsonSchemaRef`). ' +
      'A JSON Schema Credential defines the structure, data types, and validation rules for a corresponding Verifiable Trust Credential (VTC). ' +
      'This operation follows the [Verifiable Trust Specification](https://verana-labs.github.io/verifiable-trust-spec/#json-schema-credentials).',
  })
  @ApiBody({
    type: JsonSchemaCredentialDto,
    description:
      'Defines the base schema identifier and the JSON Schema reference used to create or update the JSON Schema Credential (JSC).',
    examples: {
      service: {
        summary: 'JSON Schema Credential Example',
        description:
          'Creates a JSON Schema Credential (JSC) for an organization or service. ' +
          'The `schemaBaseId` determines the base schema name, and the `jsonSchemaRef` provides the reference to the JSON Schema definition.',
        value: {
          schemaBaseId: 'organization',
          jsonSchemaRef: 'vpr:verana:vna-testnet-1/cs/v1/js/12345678',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'The JSON Schema Credential (JSC) was successfully created or updated based on the provided schema base ID and reference.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid schema input or missing required parameters.',
  })
  async createJsc(@Body() body: JsonSchemaCredentialDto) {
    return await this.trustService.createJsc(body.schemaBaseId.toLocaleLowerCase(), body.jsonSchemaRef)
  }
}
