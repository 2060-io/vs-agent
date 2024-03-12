
import { createInvitation } from '../../utils/agent'
import { CreateCredentialOfferOptions, CreateCredentialOfferResult, CreatePresentationRequestOptions, CreatePresentationRequestResult } from '../types'
import { AnonCredsRequestedAttribute } from '@credo-ts/anoncreds'
import { AgentService } from '../../services/AgentService'
import { ApiTags } from '@nestjs/swagger'
import { Controller, Get, Post, Body } from '@nestjs/common'


@ApiTags('invitation')
@Controller({
  path: 'invitation',
  version: '1',
})
export class InvitationController {
  constructor(private readonly agentService: AgentService) {}

  @Get('/')
  public async getInvitation() {
    
    return await createInvitation(await this.agentService.getAgent())
  }

  @Post('/presentation-request')
  public async createPresentationRequest(
  @Body() options: CreatePresentationRequestOptions,
): Promise<CreatePresentationRequestResult> {
  const agent = await this.agentService.getAgent()

  const { requestedCredentials } = options

  if (requestedCredentials.length === 0) {
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

    const { credentialDefinition } = await agent.modules.anoncreds.getCredentialDefinition(credentialDefinitionId)

    
    if (!credentialDefinition) {
      throw Error(`Cannot find information about credential definition ${credentialDefinitionId}.`)
    }

    // Verify that requested attributes are present in credential definition
      const { schema }= await agent.modules.anoncreds.getSchema(credentialDefinition.schemaId)

    if (!schema) {
      throw Error(`Cannot find information about schema ${credentialDefinition.schemaId}.`)
    }

    // If no attributes are specified, request all of them
    if (!attributes) {
      attributes = schema.attrNames
    }

    if (!attributes.every((item) => schema.attrNames.includes(item))) {
        throw new Error(
          `Some attributes are not present in the requested credential type: Requested: ${attributes}, Present: ${schema.attrNames}`
        )
      }

    const requestedAttributes: Record<string, AnonCredsRequestedAttribute> = {}

    requestedAttributes[schema.name] = {
        names: attributes,
        restrictions: [{ cred_def_id: credentialDefinitionId }],
    }

    const request = await agent.proofs.createRequest({protocolVersion: 'v2', proofFormats: {anoncreds: {name: 'proof-request', version: '1.0', requested_attributes: requestedAttributes }}})

    const outOfBandRecord = await agent.oob.createInvitation({ messages: [request.message], })

    return { id: request.proofRecord.id, url: outOfBandRecord.outOfBandInvitation.toUrl( { domain: process.env.AGENT_INVITATION_BASE_URL ?? 'https://2060.io/i' })}

  }

  @Post('/credential-offer')
  public async createCredentialOffer(
  @Body() options: CreateCredentialOfferOptions,
  ): Promise<CreateCredentialOfferResult> {
    const agent = await this.agentService.getAgent()

    const { claims, credentialDefinitionId } = options
    

    if (claims && !Array.isArray(claims)) {
      throw new Error('Received claims is not an array')
    }
    
    const [credentialDefinition] = await agent.modules.anoncreds.getCreatedCredentialDefinitions({ credentialDefinitionId })
      
    if (!credentialDefinition) {
      throw Error(`Cannot find information about credential definition ${credentialDefinitionId}.`)
    }
    
    // Verify that claims are present in credential definition
    const { schema }= await agent.modules.anoncreds.getSchema(credentialDefinition.credentialDefinition.schemaId)
    
    if (!schema) {
      throw Error(`Cannot find information about schema ${credentialDefinition.credentialDefinition.schemaId}.`)
    }
    
    
    if (!claims.every((item) => schema.attrNames.includes(item.name))) {
        throw new Error(
          `Some claims are not present in the requested credential type: Requested: ${claims.map(item => item.name)}, Present: ${schema.attrNames}`
        )
      }

    const request = await agent.credentials.createOffer({ protocolVersion: 'v2', credentialFormats: { anoncreds: {
      credentialDefinitionId,
      attributes: claims.map((item) => {
        return { name: item.name, mimeType: item.mimeType, value: item.value }
      }),
    }}})
    
    const outOfBandRecord = await agent.oob.createInvitation({ messages: [request.message], })
    
    return { id: request.credentialRecord.id, url: outOfBandRecord.outOfBandInvitation.toUrl( { domain: process.env.AGENT_INVITATION_BASE_URL ?? 'https://2060.io/i' })}
  }
}

