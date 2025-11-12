import { Controller, HttpException, HttpStatus, Logger, Post, Body } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger'

import { TrustService } from './TrustService'
import { IssueCredentialRequestDto } from './dto'

@ApiTags('Verifiable Trust Credential')
@Controller({ path: 'vt', version: '1' })
export class TrustController {
  private readonly logger = new Logger(TrustController.name)

  constructor(private readonly trustService: TrustService) {}

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
    return await this.trustService.issueCredential({ type, jsonSchemaCredential, claims, did })
  }

  @Post('revoke-credential')
  @ApiOperation({ summary: 'Revoke a verifiable credential' })
  @ApiBody({ schema: { example: { id: 'cred-1' } } })
  @ApiResponse({ status: 200, description: 'Credential revoked' })
  async revokeCredential() {
    throw new HttpException({ message: `This method is not implemented yet` }, HttpStatus.NOT_IMPLEMENTED)
  }
}
