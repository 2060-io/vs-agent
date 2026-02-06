import {
  AnonCredsCredentialDefinitionRepository,
  AnonCredsSchema,
  AnonCredsSchemaRepository,
} from '@credo-ts/anoncreds'
import { JsonObject, utils, W3cCredential } from '@credo-ts/core'
import { HttpException, HttpStatus, Inject, Logger } from '@nestjs/common'

import { VsAgentService } from '../../../services/VsAgentService'
import { mapToEcosystem, VsAgent } from '../../../utils'

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
    jsonSchemaCredentialId?: string
  }) {
    const agent = await this.agentService.getAgent()
    let schemaId: string | undefined
    let schema: AnonCredsSchema | undefined

    const issuerId = options.issuerId ?? agent.did
    if (!issuerId) {
      throw new Error('Agent does not have any defined public DID')
    }
    let schemaRecord
    if (options.jsonSchemaCredentialId || options.schemaId) {
      ;[schemaRecord] = await agent.modules.anoncreds.getCreatedSchemas({
        schemaId,
        issuerId,
        relatedJsonSchemaCredentialId: options.jsonSchemaCredentialId,
      })
    }
    if (schemaRecord) {
      schemaId = schemaRecord.schemaId
      schema = schemaRecord.schema
      return {
        schemaId: schemaRecord.schemaId,
        issuerId: schemaRecord.schema.issuerId,
        schema: schemaRecord.schema,
      }
    } else {
      // No schema found. A new one will be created
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
      const schemaRepository = agent.dependencyManager.resolve(AnonCredsSchemaRepository)

      schemaRecord = await schemaRepository.getBySchemaId(agent.context, schemaId)

      if (options.jsonSchemaCredentialId) {
        schemaRecord.setTag('relatedJsonSchemaCredentialId', options.jsonSchemaCredentialId)
      }

      await schemaRepository.update(agent.context, schemaRecord)

      await this.saveAttestedResource(agent, schemaRegistration, 'anonCredsSchema')
    }
    return { issuerId, schemaId, schema }
  }

  public async getOrRegisterCredentialDefinition({
    name,
    schemaId,
    issuerId,
    supportRevocation = true,
    version = '1.0',
    jsonSchemaCredentialId,
  }: {
    name?: string
    schemaId?: string
    issuerId?: string
    supportRevocation?: boolean
    version?: string
    jsonSchemaCredentialId?: string
  }) {
    const agent = await this.agentService.getAgent()
    let [credentialDefinitionRecord] = await agent.modules.anoncreds.getCreatedCredentialDefinitions({
      schemaId,
      issuerId,
      relatedJsonSchemaCredentialId: jsonSchemaCredentialId,
    })
    if (credentialDefinitionRecord)
      return { credentialDefinitionId: credentialDefinitionRecord.credentialDefinitionId }
    if (!schemaId || !name || !issuerId)
      throw new Error(`Missing required parameters to create credential definition`)

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
    credentialDefinitionRecord = await credentialDefinitionRepository.getByCredentialDefinitionId(
      agent.context,
      credentialDefinitionId,
    )
    credentialDefinitionRecord.setTag('name', name)
    credentialDefinitionRecord.setTag('version', version)
    if (jsonSchemaCredentialId) {
      credentialDefinitionRecord.setTag('relatedJsonSchemaCredentialId', jsonSchemaCredentialId)
    }

    await this.saveAttestedResource(agent, credentialRegistration, 'anonCredsCredDef')
    await credentialDefinitionRepository.update(agent.context, credentialDefinitionRecord)
    return { credentialDefinitionId }
  }

  public async getCredentialDefinition(jsonSchemaCredentialId: string) {
    const agent = await this.agentService.getAgent()

    const credentialDefinitionRepository = agent.dependencyManager.resolve(
      AnonCredsCredentialDefinitionRepository,
    )
    const existCredential = await credentialDefinitionRepository.findSingleByQuery(agent.context, {
      relatedJsonSchemaCredentialId: jsonSchemaCredentialId,
    })
    if (existCredential) {
      return existCredential.credentialDefinitionId
    }

    const { attrNames: attributes } = await this.parseJsonSchemaCredential(jsonSchemaCredentialId)

    const issuerId = agent.did!
    const name = jsonSchemaCredentialId.match(/schemas-(.+?)-jsc\.json$/)?.[1] ?? 'credential'
    const { schemaId } = await this.getOrRegisterSchema({
      attributes,
      name,
      issuerId,
      jsonSchemaCredentialId,
    })

    const { credentialDefinitionId } = await this.getOrRegisterCredentialDefinition({
      name,
      schemaId,
      issuerId,
      jsonSchemaCredentialId,
    })
    return credentialDefinitionId
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url)
    if (!res.ok) {
      throw new HttpException(`Failed to fetch ${url}: ${res.statusText}`, HttpStatus.BAD_REQUEST)
    }
    return res.json() as Promise<T>
  }

  private getCredentialSubjectId(credentialSubject: any): string {
    const subject = Array.isArray(credentialSubject) ? credentialSubject[0] : credentialSubject
    const id = subject?.id
    if (!id) {
      throw new HttpException(`Missing credentialSubject.id in credential`, HttpStatus.BAD_REQUEST)
    }
    return id
  }

  public async parseJsonSchemaCredential(jsonSchemaCredentialId: string) {
    // Check schema for credential
    const jscData = await this.fetchJson<W3cCredential>(jsonSchemaCredentialId)
    const subjectId = this.getCredentialSubjectId(jscData.credentialSubject)
    const schemaData = await this.fetchJson<JsonObject>(mapToEcosystem(subjectId))
    const parsedSchema =
      typeof schemaData.schema === 'string' ? JSON.parse(schemaData.schema) : schemaData.schema
    const subjectProps = parsedSchema?.properties?.credentialSubject?.properties ?? {}

    const attrNames = Object.keys(subjectProps).map(String)
    if (attrNames.length === 0) {
      throw new HttpException(
        `No properties found in credentialSubject of schema from ${jsonSchemaCredentialId}`,
        HttpStatus.BAD_REQUEST,
      )
    }

    return { parsedSchema, attrNames }
  }
}
