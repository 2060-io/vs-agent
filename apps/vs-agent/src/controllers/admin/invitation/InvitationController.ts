import {
  CreateCredentialOfferResult,
  CreatePresentationRequestResult,
  CreateInvitationResult,
} from '@2060.io/vs-agent-model'
import { AnonCredsRequestedAttribute } from '@credo-ts/anoncreds'
import { Controller, Get, Post, Body } from '@nestjs/common'
import { ApiBadRequestResponse, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

import { PUBLIC_API_BASE_URL } from '../../config/constants'
import { UrlShorteningService } from '../../services/UrlShorteningService'
import { VsAgentService } from '../../services/VsAgentService'
import { createInvitation } from '../../utils/agent'

import { CreateCredentialOfferDto, CreatePresentationRequestDto } from './InvitationDto'
import { createDocLoader } from '../../utils/swagger-docs'
const docs = createDocLoader('doc/vs-agent-api.md')

@ApiTags('invitation')
@Controller({
  path: 'invitation',
  version: '1',
})
export class InvitationController {
  constructor(
    private readonly agentService: VsAgentService,
    private readonly urlShortenerService: UrlShorteningService,
  ) {}

  @Get('/')
  @ApiOperation({
    summary: 'Connection Invitation',
    description: docs.getSection('### Connection Invitation', { includeFences: true }),
  })
  @ApiOkResponse({
    description: 'Out-of-band invitation payload',
    schema: {
      example: {
        url: 'https://hologram.zone/?oob=eyJ0eXAiOiJKV1QiLCJhbGci...',
      },
    },
  })
  public async getInvitation(): Promise<CreateInvitationResult> {
    return await createInvitation(await this.agentService.getAgent())
  }

  @Post('/presentation-request')
  @ApiOperation({
    summary: 'Presentation Request',
    description: [
      docs.getSection('### Presentation Request', { includeFences: true }),
      docs.getSection('#### Presentation Callback API', { includeFences: true }),
    ].join('\n\n'),
  })
  @ApiBody({
    type: CreatePresentationRequestDto,
    examples: {
      example: {
        summary: 'Create Presentation Request',
        value: {
          ref: '1234-5678',
          callbackUrl: 'https://myhost/mycallbackurl',
          requestedCredentials: [
            {
              credentialDefinitionId:
                'did:web:chatbot-demo.dev.2060.io?service=anoncreds&relativeRef=/credDef/8TsGLaSPVKPVMXK8APzBRcXZryxutvQuZnnTcDmbqd9p',
              attributes: ['phoneNumber'],
            },
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Presentation request invitation',
    schema: {
      example: {
        proofExchangeId: '123e4567-e89b-12d3-a456-426614174000',
        url: 'didcomm://example.com/...',
        shortUrl: `${PUBLIC_API_BASE_URL}/s?id=abcd1234`,
      },
    },
  })
  public async createPresentationRequest(
    @Body() options: CreatePresentationRequestDto,
  ): Promise<CreatePresentationRequestResult> {
    const agent = await this.agentService.getAgent()

    const { requestedCredentials, ref, callbackUrl } = options

    if (!requestedCredentials?.length) {
      throw Error('You must specify a least a requested credential')
    }
    const credentialDefinitionId = requestedCredentials[0].credentialDefinitionId
    let attributes = requestedCredentials[0].attributes

    if (!credentialDefinitionId) {
      throw Error('Verifiable credential request must include credentialDefinitionId')
    }

    if (attributes && !Array.isArray(attributes)) {
      throw new Error('Received attributes is not an array')
    }

    const { credentialDefinition } =
      await agent.modules.anoncreds.getCredentialDefinition(credentialDefinitionId)

    if (!credentialDefinition) {
      throw Error(`Cannot find information about credential definition ${credentialDefinitionId}.`)
    }

    // Verify that requested attributes are present in credential definition
    const { schema } = await agent.modules.anoncreds.getSchema(credentialDefinition.schemaId)

    if (!schema) {
      throw Error(`Cannot find information about schema ${credentialDefinition.schemaId}.`)
    }

    // If no attributes are specified, request all of them
    if (!attributes) {
      attributes = schema.attrNames
    }

    if (!attributes.every(item => schema.attrNames.includes(item))) {
      throw new Error(
        `Some attributes are not present in the requested credential type: Requested: ${attributes}, Present: ${schema.attrNames}`,
      )
    }

    const requestedAttributes: Record<string, AnonCredsRequestedAttribute> = {}

    requestedAttributes[schema.name] = {
      names: attributes,
      restrictions: [{ cred_def_id: credentialDefinitionId }],
    }

    const request = await agent.proofs.createRequest({
      protocolVersion: 'v2',
      proofFormats: {
        anoncreds: { name: 'proof-request', version: '1.0', requested_attributes: requestedAttributes },
      },
    })

    request.proofRecord.metadata.set('_2060/requestedCredentials', requestedCredentials)
    request.proofRecord.metadata.set('_2060/callbackParameters', { ref, callbackUrl })
    await agent.proofs.update(request.proofRecord)

    const { url } = await createInvitation(await this.agentService.getAgent(), [request.message])

    const shortUrlId = await this.urlShortenerService.createShortUrl({
      longUrl: url,
      relatedFlowId: request.proofRecord.id,
    })
    const shortUrl = `${PUBLIC_API_BASE_URL}/s?id=${shortUrlId}`

    return {
      proofExchangeId: request.proofRecord.id,
      url,
      shortUrl,
    }
  }

  @Post('/credential-offer')
  @ApiOperation({
    summary: 'Credential Offer',
    description: docs.getSection('### Credential Offer'),
  })
  @ApiBody({
    description: docs.getSection('### Credential Offer'),
    type: CreateCredentialOfferDto,
    examples: {
      example: {
        summary: 'Phone Number VC Offer',
        value: {
          credentialDefinitionId:
            'did:web:chatbot-demo.dev.2060.io?service=anoncreds&relativeRef=/credDef/8TsGLaSPVKPVMXK8APzBRcXZryxutvQuZnnTcDmbqd9p',
          claims: [{ name: 'phoneNumber', value: '+57128348520' }],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Credential offer invitation',
    schema: {
      example: {
        credentialExchangeId: 'abcd1234-5678efgh-9012ijkl-3456mnop',
        url: 'didcomm://example.com/offer/...',
        shortUrl: `${PUBLIC_API_BASE_URL}/s?id=wxyz7890`,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid offer payload' })
  @ApiBody({
    type: CreateCredentialOfferDto,
    examples: {
      example: {
        summary: 'Phone Number',
        value: {
          credentialDefinitionId:
            'did:web:chatbot-demo.dev.2060.io?service=anoncreds&relativeRef=/credDef/8TsGLaSPVKPVMXK8APzBRcXZryxutvQuZnnTcDmbqd9p',
          claims: [{ name: 'phoneNumber', value: '+57128348520' }],
        },
      },
    },
  })
  public async createCredentialOffer(
    @Body() options: CreateCredentialOfferDto,
  ): Promise<CreateCredentialOfferResult> {
    const agent = await this.agentService.getAgent()

    const { claims, credentialDefinitionId } = options

    if (claims && !Array.isArray(claims)) {
      throw new Error('Received claims is not an array')
    }

    if (!claims) throw new Error('No claims are defined')

    const [credentialDefinition] = await agent.modules.anoncreds.getCreatedCredentialDefinitions({
      credentialDefinitionId,
    })

    if (!credentialDefinition) {
      throw Error(`Cannot find information about credential definition ${credentialDefinitionId}.`)
    }

    // Verify that claims are present in credential definition
    const { schema } = await agent.modules.anoncreds.getSchema(
      credentialDefinition.credentialDefinition.schemaId,
    )

    if (!schema) {
      throw Error(
        `Cannot find information about schema ${credentialDefinition.credentialDefinition.schemaId}.`,
      )
    }

    if (!claims.every(item => schema.attrNames.includes(item.name))) {
      throw new Error(
        `Some claims are not present in the requested credential type: Requested: ${claims.map(item => item.name)}, Present: ${schema.attrNames}`,
      )
    }

    const request = await agent.credentials.createOffer({
      protocolVersion: 'v2',
      credentialFormats: {
        anoncreds: {
          credentialDefinitionId,
          attributes: claims.map(item => {
            return { name: item.name, mimeType: item.mimeType, value: item.value }
          }),
        },
      },
    })

    const { url } = await createInvitation(await this.agentService.getAgent(), [request.message])

    const shortUrlId = await this.urlShortenerService.createShortUrl({
      longUrl: url,
      relatedFlowId: request.credentialRecord.id,
    })
    const shortUrl = `${PUBLIC_API_BASE_URL}/s?id=${shortUrlId}`

    return {
      credentialExchangeId: request.credentialRecord.id,
      url,
      shortUrl,
    }
  }
}
