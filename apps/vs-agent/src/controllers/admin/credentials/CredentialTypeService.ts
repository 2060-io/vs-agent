import {
  AnonCredsCredentialDefinitionRepository,
  AnonCredsSchema,
  AnonCredsSchemaRepository,
} from '@credo-ts/anoncreds'
import { JsonObject, TagsBase, utils, W3cCredential } from '@credo-ts/core'
import { HttpException, HttpStatus, Inject, Logger } from '@nestjs/common'

import { VsAgentService } from '../../../services/VsAgentService'
import { mapToEcosystem, VsAgent } from '../../../utils'

type Tags = TagsBase & {
  type?: never
  attestedResourceId?: never
}

export class CredentialTypesService {
  private readonly logger = new Logger(CredentialTypesService.name)

  constructor(@Inject(VsAgentService) private readonly agentService: VsAgentService) {}

  public async saveAttestedResource(agent: VsAgent, resource: Record<string, unknown>, tags?: Tags) {
    if (!resource) return
    return await agent.genericRecords.save({
      id: utils.uuid(),
      content: resource,
      tags: {
        attestedResourceId: resource.id as string,
        type: 'AttestedResource',
        ...tags
      },
    })
  }

  public async findSchema(options: {
    schemaId?: string
    attributes?: string[]
    name?: string
    version?: string
    issuerId?: string
    jsonSchemaCredentialId?: string
  }) {
    const agent = await this.agentService.getAgent()
    let schemaId: string | undefined

    if (!options.jsonSchemaCredentialId && (!options.name || !options.version)) {
      throw new Error('Either jsonSchemaCredentialiD or "name" and "version" must be provided')
    }
    const issuerId = options.issuerId ?? agent.did
    if (!issuerId) {
      throw new Error('Agent does not have any defined public DID')
    }

    let schemaRecord
    ;[schemaRecord] = await agent.modules.anoncreds.getCreatedSchemas({
        schemaId,
        issuerId,
        relatedJsonSchemaCredentialId: options.jsonSchemaCredentialId,
    })

    if (schemaRecord) return schemaRecord
  }

  public async findCredentialDefinition(options: {
    schemaId?: string
    issuerId?: string
    name?: string
    version?: string
    relatedJsonSchemaCredentialId?: string
  }) {
    const { name, version, schemaId, issuerId, relatedJsonSchemaCredentialId } = options
  
    const agent = await this.agentService.getAgent()

    let [credentialDefinitionRecord] = await agent.modules.anoncreds.getCreatedCredentialDefinitions({
      schemaId,
      issuerId,
      tag: `${name}.${version}`,
      relatedJsonSchemaCredentialId,
    })
    if (credentialDefinitionRecord) return credentialDefinitionRecord
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
    let schemaRecord = await this.findSchema(options)

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
      const schemaRegistrationOptions = { extraMetadata: {
      relatedJsonSchemaCredentialId: options.jsonSchemaCredentialId,
    }}
      const { schemaState, registrationMetadata: schemaMetadata } =
        await agent.modules.anoncreds.registerSchema({
          schema: {
            attrNames: options.attributes,
            name: options.name,
            version: options.version ?? '1.0',
            issuerId,
          },
          options: schemaRegistrationOptions,
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

      await this.saveAttestedResource(agent, schemaRegistration, 
        { 
          resourceType: 'anonCredsSchema', 
          relatedJsonSchemaCredentialId: options.jsonSchemaCredentialId 
        })
    }
    return { issuerId, schemaId, schema }
  }


  public async registerCredentialDefinition(options: {
    name: string
    schemaId: string
    issuerId: string
    supportRevocation?: boolean
    version?: string
    jsonSchemaCredentialId?: string
  }) {
    const { name, schemaId, issuerId, supportRevocation = false, version = '1.0', jsonSchemaCredentialId } = options
    const agent = await this.agentService.getAgent()

    const credentialDefinitionRegistrationOptions = { supportRevocation, extraMetadata: {
      relatedJsonSchemaCredentialId: jsonSchemaCredentialId,
    }}

    const { credentialDefinitionState, registrationMetadata: credDefMetadata } =
      await agent.modules.anoncreds.registerCredentialDefinition({
        credentialDefinition: { issuerId, schemaId, tag: `${name}.${version}` },
        options: credentialDefinitionRegistrationOptions,
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
    if (jsonSchemaCredentialId) {
      credentialDefinitionRecord.setTag('relatedJsonSchemaCredentialId', jsonSchemaCredentialId)
    }

    await this.saveAttestedResource(agent, credentialRegistration, { 
      resourceType: 'anonCredsCredDef', 
      relatedJsonSchemaCredentialId: jsonSchemaCredentialId })
    await credentialDefinitionRepository.update(agent.context, credentialDefinitionRecord)
    
    return credentialDefinitionRecord
  }

  /**
   * Gets or registers an AnonCreds Credential Definition based on the provided parameters. If a 
   * credential definition with the same schemaId, issuerId, name, version, and relatedJsonSchemaCredentialId 
   * already exists, it will be returned. Otherwise, a new credential definition will be registered.
   * 
   * @returns AnonCredCredentialDefinitionRecord of the existing or newly created credential definition
   */
  public async getOrRegisterCredentialDefinition({
    name,
    schemaId,
    issuerId,
    supportRevocation = false,
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
    let credentialDefinitionRecord = await this.findCredentialDefinition({
      schemaId,
      issuerId,
      name, 
      version,
      relatedJsonSchemaCredentialId: jsonSchemaCredentialId,
    })
    if (credentialDefinitionRecord) return credentialDefinitionRecord
    if (!schemaId || !name || !issuerId)
      throw new Error(`Missing required parameters to create credential definition`)

    return this.registerCredentialDefinition({ name, schemaId, issuerId, supportRevocation, version, jsonSchemaCredentialId })
  }

  public async getCredentialDefinition(jsonSchemaCredentialId: string) {
    const agent = await this.agentService.getAgent()

    const credentialDefinitionRepository = agent.dependencyManager.resolve(
      AnonCredsCredentialDefinitionRepository,
    )
    const existingCredentialDefinitionRecord = await credentialDefinitionRepository.findSingleByQuery(agent.context, {
      relatedJsonSchemaCredentialId: jsonSchemaCredentialId,
    })
    if (existingCredentialDefinitionRecord) {
      return existingCredentialDefinitionRecord
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

    const credentialDefinitionRecord = await this.getOrRegisterCredentialDefinition({
      name,
      schemaId,
      issuerId,
      jsonSchemaCredentialId,
    })
    return credentialDefinitionRecord
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.statusText}`)
    }
    return res.json() as Promise<T>
  }

  private getCredentialSubjectId(credentialSubject: any): string {
    const subject = Array.isArray(credentialSubject) ? credentialSubject[0] : credentialSubject
    const id = subject?.id
    if (!id) {
      throw new Error('Missing credentialSubject.id in credential')
    }
    return id
  }

  public async parseJsonSchemaCredential(jsonSchemaCredentialId: string) {
    // Check schema for credentialt
    try {
    const jscData = await this.fetchJson<W3cCredential>(jsonSchemaCredentialId)
    const subjectId = this.getCredentialSubjectId(jscData.credentialSubject)
    const schemaData = await this.fetchJson<JsonObject>(mapToEcosystem(subjectId))
    const parsedSchema =
      typeof schemaData.schema === 'string' ? JSON.parse(schemaData.schema) : schemaData.schema
    const subjectProps = parsedSchema?.properties?.credentialSubject?.properties ?? {}

    const attrNames = Object.keys(subjectProps).map(String)
    if (attrNames.length === 0) {
      throw new Error(`No properties found in credentialSubject of schema from ${jsonSchemaCredentialId}`)
    }
    return { parsedSchema, attrNames }
    } catch(error) {
      throw new Error(`Failed to parse JSON Schema Credential ${jsonSchemaCredentialId}: ${error}`)
    }

  }
}
