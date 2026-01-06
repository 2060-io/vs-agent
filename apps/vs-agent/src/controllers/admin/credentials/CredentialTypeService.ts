import { AnonCredsCredentialDefinitionRepository, AnonCredsSchema } from '@credo-ts/anoncreds'
import { utils } from '@credo-ts/core'
import { Inject, Logger } from '@nestjs/common'

import { VsAgentService } from '../../../services/VsAgentService'
import { VsAgent } from '../../../utils'

export class CredentialTypesService {
  private readonly logger = new Logger(CredentialTypesService.name)

  constructor(@Inject(VsAgentService) private readonly agentService: VsAgentService) {}

  public async saveAttestedResource(agent: VsAgent, resource: Record<string, unknown>, resourceType: string) {
    if (!resource) return
    return await agent.genericRecords.save({
      id: utils.uuid(),
      content: resource,
      tags: {
        attestedResourceId: resource.id as string,
        type: 'AttestedResource',
        resourceType,
      },
    })
  }

  public async getOrRegisterSchema(options: {
    schemaId?: string
    attributes?: string[]
    name?: string
    version?: string
    issuerId?: string
    jsonSchemaCredential?: string
  }) {
    const agent = await this.agentService.getAgent()

    let schemaId: string | undefined
    let schema: AnonCredsSchema | undefined

    const issuerId = options.issuerId ?? agent.did
    if (!issuerId) {
      throw new Error('Agent does not have any defined public DID')
    }

    if (options.schemaId) {
      const schemaState = await agent.modules.anoncreds.getSchema(options.schemaId)

      if (!schemaState.schema) {
        throw new Error('Specified schema has not been found')
      }
      schemaId = schemaState.schemaId
      schema = schemaState.schema
    } else {
      // No schema specified. A new one will be created
      if (!options.attributes || !options.name) {
        throw new Error('Missing required options: "name" and "attributes" must be provided')
      }
      const { schemaState, registrationMetadata: schemaMetadata } =
        await agent.modules.anoncreds.registerSchema({
          schema: {
            attrNames: options.attributes,
            name: options.name,
            version: options.version ?? '1.0',
            issuerId,
          },
          options: {},
        })
      const { attestedResource: schemaRegistration } = schemaMetadata as {
        attestedResource: Record<string, unknown>
      }

      this.logger.debug!(`schemaState: ${JSON.stringify(schemaState)}`)
      schemaId = schemaState.schemaId
      schema = schemaState.schema

      if (!schemaId || !schema) {
        throw new Error('Schema for the credential definition could not be created')
      }
      await this.saveAttestedResource(agent, schemaRegistration, 'anonCredsSchema')
    }
    return { issuerId, schemaId, schema }
  }

  public async getOrRegisterCredentialDefinition({
    name,
    schemaId,
    issuerId,
    supportRevocation = false,
    version = '1.0',
    jsonSchemaCredential,
  }: {
    name: string
    schemaId: string
    issuerId: string
    supportRevocation?: boolean
    version?: string
    jsonSchemaCredential?: string
  }) {
    const agent = await this.agentService.getAgent()
    const { credentialDefinitionState, registrationMetadata: credDefMetadata } =
      await agent.modules.anoncreds.registerCredentialDefinition({
        credentialDefinition: { issuerId, schemaId, tag: `${name}.${version}` },
        options: { supportRevocation },
      })
    const { attestedResource: credentialRegistration } = credDefMetadata as {
      attestedResource: Record<string, unknown>
    }

    const credentialDefinitionId = credentialDefinitionState.credentialDefinitionId
    this.logger.debug!(`credentialDefinitionState: ${JSON.stringify(credentialDefinitionState)}`)

    if (!credentialDefinitionId) {
      throw new Error(`Cannot create credential definition: ${JSON.stringify(credentialRegistration)}`)
    }

    this.logger.log(`Credential Definition Id: ${credentialDefinitionId}`)

    // Apply name and version as tags
    const credentialDefinitionRepository = agent.dependencyManager.resolve(
      AnonCredsCredentialDefinitionRepository,
    )
    const credentialDefinitionRecord = await credentialDefinitionRepository.getByCredentialDefinitionId(
      agent.context,
      credentialDefinitionId,
    )
    credentialDefinitionRecord.setTag('name', name)
    credentialDefinitionRecord.setTag('version', version)
    if (jsonSchemaCredential)
      credentialDefinitionRecord.setTag('relatedJsonSchemaCredential', jsonSchemaCredential)

    await this.saveAttestedResource(agent, credentialRegistration, 'anonCredsCredDef')
    await credentialDefinitionRepository.update(agent.context, credentialDefinitionRecord)
    return { credentialDefinitionId }
  }
}
