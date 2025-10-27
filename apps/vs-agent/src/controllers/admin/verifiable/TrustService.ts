import { AnonCredsCredentialDefinitionRepository } from '@credo-ts/anoncreds'
import {
  DidDocumentService,
  DidRecord,
  DidRepository,
  JsonObject,
  JsonTransformer,
  utils,
  W3cCredential,
  W3cJsonLdVerifiableCredential,
} from '@credo-ts/core'
import { Logger, Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common'

import { UrlShorteningService } from '../../../services'
import { VsAgentService } from '../../../services/VsAgentService'
import { createInvitation, getEcsSchemas, VsAgent } from '../../../utils'
import {
  addDigestSRI,
  createCredential,
  createJsonSchema,
  createJsonSubjectRef,
  createPresentation,
  generateDigestSRI,
  getVerificationMethodId,
  mapToEcosystem,
  signerW3c,
  validateSchema,
} from '../../../utils/setupSelfTr'

@Injectable()
export class TrustService {
  private readonly logger = new Logger(TrustService.name)
  private ecsSchemas

  constructor(
    private readonly agentService: VsAgentService,
    private readonly urlShortenerService: UrlShorteningService,
    @Inject('PUBLIC_API_BASE_URL') private readonly publicApiBaseUrl: string,
  ) {
    this.ecsSchemas = getEcsSchemas(publicApiBaseUrl)
  }

  // Helper function to retrieve schema data based on tag name
  public async getSchemaData(tagName: string, notFoundMessage: string) {
    try {
      const { didRecord } = await this.getDidRecord()
      const metadata = didRecord.metadata.get(tagName)

      if (!metadata) {
        throw new HttpException(notFoundMessage, HttpStatus.NOT_FOUND)
      }

      const { integrityData, ...rest } = metadata
      void integrityData
      return rest
    } catch (error) {
      this.handleError('loading', tagName, error, 'Failed to load schema')
    }
  }

  public async removeSchemaData(tagName: string) {
    try {
      const { agent, didRecord } = await this.getDidRecord()
      didRecord.metadata.delete(tagName)
      const linkedServiceIndex = this.findLinkedServiceIndex(didRecord, tagName)
      if (linkedServiceIndex !== -1) {
        didRecord.didDocument?.service?.splice(linkedServiceIndex, 1)
      }

      await this.updateDidRecord(agent, didRecord)

      this.logger.log(`Metadata ${tagName} successfully removed`)
      return { success: true, message: `Metadata ${tagName} removed` }
    } catch (error) {
      this.handleError('removing', tagName, error, 'Failed to remove schema data')
    }
  }

  public async updateSchemaData(credential: W3cJsonLdVerifiableCredential) {
    try {
      const { agent, didRecord } = await this.getDidRecord()
      const tagName = credential.type
        .find(t => t !== 'VerifiableCredential' && t !== 'VerifiableTrustCredential')
        ?.toLowerCase()

      if (!tagName) {
        throw new HttpException(
          `No custom credential type found, skipping schema update.`,
          HttpStatus.NOT_FOUND,
        )
      }
      const schemaKey = `schemas-${tagName}`
      const serviceEndpoint = `${this.publicApiBaseUrl}/vt/${schemaKey}-c-vp.json`
      const unsignedPresentation = createPresentation({
        id: serviceEndpoint,
        holder: agent.did,
        verifiableCredential: [credential],
      })
      const integrityData = generateDigestSRI(JSON.stringify(credential.credentialSubject))
      didRecord.didDocument?.service?.push(
        new DidDocumentService({
          id: `${agent.did}#vpr-${schemaKey}-c-vp`,
          serviceEndpoint,
          type: 'LinkedVerifiablePresentation',
        }),
      )
      const presentation = await signerW3c(
        agent,
        unsignedPresentation,
        getVerificationMethodId(agent.config.logger, didRecord),
      )

      didRecord.metadata.set(schemaKey, { ...presentation, integrityData })
      await this.updateDidRecord(agent, didRecord)
      this.logger.log(`Metadata for "${tagName}" updated successfully.`)
      return presentation
    } catch (error) {
      this.handleError('updating', credential.id ?? '', error, 'Error updating credential')
    }
  }

  // Helper function to retrieve json schema credential data based on id
  public async getJsonCredential(id: string) {
    try {
      const { didRecord } = await this.getDidRecord()

      const metadata = didRecord.metadata.get(id)
      if (!metadata) {
        throw new HttpException(`Metadata for credential "${id}" not found`, HttpStatus.NOT_FOUND)
      }

      const { integrityData, ...rest } = metadata
      void integrityData
      return rest
    } catch (error) {
      this.handleError('loading', id, error, 'Failed to load schema')
    }
  }

  public async removeJsonCredential(id: string) {
    try {
      const { agent, didRecord } = await this.getDidRecord()
      didRecord.metadata.delete(id)
      await this.updateDidRecord(agent, didRecord)
      this.logger.log(`Metadata ${id} successfully removed`)
      return { success: true, message: `Metadata ${id} removed` }
    } catch (error) {
      this.handleError('removing', id, error, 'Failed to remove schema data')
    }
  }

  public async updateJsonCredential(id: string, jsonSchemaRef: string) {
    try {
      const { agent, didRecord } = await this.getDidRecord()
      const savedCredential = didRecord.metadata.get(id)
      const { id: subjectId, claims } = createJsonSubjectRef(jsonSchemaRef)
      const credentialSubject = {
        id: subjectId,
        claims: await addDigestSRI(subjectId, claims, this.ecsSchemas),
      }
      let unsignedCredential
      if (savedCredential) unsignedCredential = savedCredential as W3cJsonLdVerifiableCredential

      if (unsignedCredential) {
        delete (unsignedCredential as any).proof
        unsignedCredential.credentialSubject = credentialSubject
      } else {
        unsignedCredential = createCredential({
          id: `${this.publicApiBaseUrl}/vt/schemas-${id}-jsc.json`,
          type: ['VerifiableCredential', 'JsonSchemaCredential'],
          issuer: agent.did,
          credentialSubject,
        })
        unsignedCredential.credentialSchema = await addDigestSRI(
          createJsonSchema.id,
          createJsonSchema,
          this.ecsSchemas,
        )
      }
      const integrityData = generateDigestSRI(JSON.stringify(unsignedCredential))

      const verificationMethodId = getVerificationMethodId(agent.config.logger, didRecord)
      const credential = await signerW3c(
        agent,
        JsonTransformer.fromJSON(unsignedCredential, W3cCredential),
        verificationMethodId,
      )
      didRecord.metadata.set(id, { ...credential, integrityData })
      await this.updateDidRecord(agent, didRecord)
      return credential.jsonCredential
    } catch (error) {
      this.handleError('updating', id, error, 'Failed to update schema')
    }
  }

  private async issueW3cJsonLd(
    agent: VsAgent,
    didRecord: DidRecord,
    did: string,
    jsonSchemaCredential: string,
    claims: JsonObject,
  ) {
    const unsignedCredential = createCredential({
      id: did,
      type: [
        'VerifiableCredential',
        'VerifiableTrustCredential',
        this.buildCredentialKey(jsonSchemaCredential),
      ],
      issuer: agent.did,
      credentialSubject: {
        id: did,
        claims,
      },
    })
    unsignedCredential.credentialSchema = {
      id: jsonSchemaCredential,
      type: 'JsonSchemaCredential',
    }
    const verificationMethodId = getVerificationMethodId(agent.config.logger, didRecord)
    const credential = await signerW3c(
      agent,
      JsonTransformer.fromJSON(unsignedCredential, W3cCredential),
      verificationMethodId,
    )
    return credential.jsonCredential
  }

  public async issueCredential(
    type: 'jsonld' | 'anoncreds',
    jsonSchemaCredential: string,
    claims: JsonObject,
    did?: string,
  ) {
    try {
      // Check schema for credential
      const { agent, didRecord } = await this.getDidRecord()
      const jscData = await this.fetchJson<W3cCredential>(jsonSchemaCredential)
      const subjectId = this.getCredentialSubjectId(jscData.credentialSubject)
      const schemaData = await this.fetchJson<JsonObject>(mapToEcosystem(subjectId))
      const parsedSchema =
        typeof schemaData.schema === 'string' ? JSON.parse(schemaData.schema) : schemaData.schema
      const subjectProps = parsedSchema?.properties?.credentialSubject?.properties ?? {}

      const attrNames = Object.keys(subjectProps).map(String)
      if (attrNames.length === 0) {
        throw new HttpException(
          `No properties found in credentialSubject of schema from ${jsonSchemaCredential}`,
          HttpStatus.BAD_REQUEST,
        )
      }
      validateSchema(parsedSchema, claims)

      switch (type) {
        case 'jsonld':
          if (!did)
            throw new HttpException(`Did must be present for json-ld creential`, HttpStatus.BAD_REQUEST)
          const credential = await this.issueW3cJsonLd(agent, didRecord, did, jsonSchemaCredential, claims)
          return { status: 200, didcommInvitationUrl: '', credential }
        case 'anoncreds':
          const credentialDefinitionId = await this.getCredentialDefinition(
            agent,
            jsonSchemaCredential,
            attrNames,
          )
          const request = await agent.credentials.createOffer({
            protocolVersion: 'v2',
            credentialFormats: {
              anoncreds: {
                attributes: attrNames.map(name => {
                  return { name, mimeType: '', value: JSON.stringify(claims[name]) }
                }),
                credentialDefinitionId,
              },
            },
          })
          const { url: longUrl } = await createInvitation({
            agent,
            messages: [request.message],
          })

          const shortUrlId = await this.urlShortenerService.createShortUrl({
            longUrl,
            relatedFlowId: request.credentialRecord.id,
          })
          const didcommInvitationUrl = `${this.publicApiBaseUrl}/s?id=${shortUrlId}`
          return {
            status: 200,
            didcommInvitationUrl,
            credential: { credentialExchangeId: request.credentialRecord.id },
          }
        default:
          throw new HttpException(`Invalid credential type: ${type}`, HttpStatus.BAD_REQUEST)
      }
    } catch (error) {
      this.handleError('issue', did ?? '', error, 'Failed to issue credential')
    }
  }

  public async getCredentialDefinition(agent: VsAgent, jsonSchemaCredential: string, attrNames: string[]) {
    const credentialDefinitionRepository = agent.dependencyManager.resolve(
      AnonCredsCredentialDefinitionRepository,
    )
    const existCredential = await credentialDefinitionRepository.findSingleByQuery(agent.context, {
      jsonSchemaCredential,
    })
    if (existCredential) {
      return existCredential.credentialDefinitionId
    }

    const issuerId = agent.did!
    const { schemaState, registrationMetadata: schemaMetadata } =
      await agent.modules.anoncreds.registerSchema({
        schema: {
          attrNames,
          name: jsonSchemaCredential,
          version: '1.0',
          issuerId,
        },
        options: {},
      })
    const { attestedResource: schemaRegistration } = schemaMetadata as {
      attestedResource: Record<string, unknown>
    }
    const schemaId = schemaState.schemaId
    const schema = schemaState.schema

    if (!schemaId || !schema) {
      throw new HttpException(
        `Schema for the credential definition could not be created`,
        HttpStatus.EXPECTATION_FAILED,
      )
    }
    await this.saveAttestedResource(agent, schemaRegistration)
    const { credentialDefinitionState, registrationMetadata: credDefMetadata } =
      await agent.modules.anoncreds.registerCredentialDefinition({
        credentialDefinition: { issuerId, schemaId, tag: jsonSchemaCredential },
        options: { supportRevocation: false },
      })
    const { attestedResource: credentialRegistration } = credDefMetadata as {
      attestedResource: Record<string, unknown>
    }
    credentialRegistration.relatedJsonSchemaCredential = jsonSchemaCredential
    await this.saveAttestedResource(agent, credentialRegistration)

    const credentialDefinitionId = credentialDefinitionState.credentialDefinitionId
    if (!credentialDefinitionId) {
      throw new HttpException(
        `Cannot create credential definition: ${JSON.stringify(credentialDefinitionState)}`,
        HttpStatus.EXPECTATION_FAILED,
      )
    }
    const credentialDefinitionRecord = await credentialDefinitionRepository.getByCredentialDefinitionId(
      agent.context,
      credentialDefinitionId,
    )
    await credentialDefinitionRepository.update(agent.context, credentialDefinitionRecord)
    return credentialDefinitionId
  }

  // Helpers
  private async getDidRecord() {
    const agent = await this.agentService.getAgent()
    const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })
    return { agent, didRecord }
  }

  private async updateDidRecord(agent: VsAgent, didRecord: DidRecord) {
    const repo = agent.context.dependencyManager.resolve(DidRepository)
    await repo.update(agent.context, didRecord)
  }

  private handleError(action: string, tagName: string, error: any, defaultMsg: string) {
    const message = error?.message ?? String(error)
    this.logger.error(`Error ${action} metadata "${tagName}": ${message}`)
    if (error instanceof HttpException) throw error
    throw new HttpException(message || defaultMsg, HttpStatus.BAD_REQUEST)
  }

  /**
   * Finds the index of the linked service related to a given tag name.
   *
   * TODO: Fix service ID prefix ('vpr-schemas-' → 'vpr-ecs-') per spec
   * Ref: https://verana-labs.github.io/verifiable-trust-spec/#vt-ecs-cred-verifiable-trust-essential-schema-credentials
   */
  private findLinkedServiceIndex(didRecord: DidRecord, tagName: string): number {
    const services = didRecord.didDocument?.service ?? []
    const normalizedTag = tagName.replace('ecs-', 'schemas-')
    return services.findIndex(service => service.id.includes(normalizedTag))
  }

  // TODO: Simplify this implementation. The same approach is already used in the Credential Type Controller
  private async saveAttestedResource(agent: VsAgent, resource: Record<string, unknown>) {
    if (!resource) return
    return await agent.genericRecords.save({
      id: utils.uuid(),
      content: resource,
      tags: { attestedResourceId: resource.id as string, type: 'AttestedResource' },
    })
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

  /**
   * Derives a standardized credential type key from a JSON Schema file URL or path.
   * Examples:
   *  - "https://example.com/schemas-person-identity.json" → "PersonIdentityCredential"
   *
   * @param schemaUrl - The URL or local path of the JSON schema file.
   * @todo Review whether this approach is the best way to derive and store keys
   *       for GenericRecord entities. Consider future schema naming conventions
   *       or other potential conflicts.
   */
  private buildCredentialKey(schemaUrl: string): string {
    if (!schemaUrl) {
      throw new Error('Schema URL or path cannot be empty')
    }
    const fileName = schemaUrl.split('/').pop() ?? ''
    const baseName = fileName
      .replace(/^schemas[-_]?/, '')
      .replace(/\jsc.json$/i, '')
      .trim()
    const words = baseName.split(/[-_]/).filter(Boolean)
    const pascalCaseName = words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')
    return `${pascalCaseName}Credential`
  }
}
