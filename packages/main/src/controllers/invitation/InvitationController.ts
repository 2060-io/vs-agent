import {
  CreateCredentialOfferResult,
  CreatePresentationRequestResult,
  CreateInvitationResult,
} from '@2060.io/service-agent-model'
import { AnonCredsRequestedAttribute } from '@credo-ts/anoncreds'
import { Controller, Get, Post, Body } from '@nestjs/common'
import { ApiBody, ApiTags } from '@nestjs/swagger'

import { AgentService } from '../../services/AgentService'
import { UrlShorteningService } from '../../services/UrlShorteningService'
import { createInvitation } from '../../utils/agent'

import { CreateCredentialOfferDto, CreatePresentationRequestDto } from './InvitationDto'

@ApiTags('invitation')
@Controller({
  path: 'invitation',
  version: '1',
})
export class InvitationController {
  constructor(
    private readonly agentService: AgentService,
    private readonly urlShortenerService: UrlShorteningService,
  ) {}

  @Get('/')
  public async getInvitation(): Promise<CreateInvitationResult> {
    return await createInvitation(await this.agentService.getAgent())
  }

  @Post('/presentation-request')
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
    const shortUrl = `${process.env.PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/s?id=${shortUrlId}`

    return {
      proofExchangeId: request.proofRecord.id,
      url,
      shortUrl,
    }
  }

  @Post('/credential-offer')
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
    const shortUrl = `${process.env.PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/s?id=${shortUrlId}`

    return {
      credentialExchangeId: request.credentialRecord.id,
      url,
      shortUrl,
    }
  }
}
