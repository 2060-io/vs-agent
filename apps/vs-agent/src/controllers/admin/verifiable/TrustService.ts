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
  W3cJsonLdVerifiablePresentation,
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

  private async getTrustCredential(key: '_vt/vtc' | '_vt/jsc', schemaId?: string) {
    try {
      const { didRecord } = await this.getDidRecord()
      const metadata = this.findMetadataEntry(didRecord, key, schemaId)
      if (!metadata) {
        throw new HttpException('Schema not found', HttpStatus.NOT_FOUND)
      }
      return metadata.data
    } catch (error) {
      this.handleError(error, 'Failed to load schema')
    }
  }

  public async getVerifiableTrustCredential(schemaId?: string, page = 1, limit = 10) {
    return await this.getTrustCredentialPaginated('_vt/vtc', schemaId, page, limit)
  }

  public async getJsonSchemaCredential(schemaId?: string, page = 1, limit = 10) {
    return await this.getTrustCredentialPaginated('_vt/jsc', schemaId, page, limit)
  }

  private async getTrustCredentialPaginated(
    key: '_vt/vtc' | '_vt/jsc',
    schemaId?: string,
    page = 1,
    limit = 10,
  ) {
    const allMetadata = await this.getTrustCredential(key, schemaId)
    if (schemaId) return allMetadata
    if (!allMetadata || Object.keys(allMetadata).length === 0) {
      throw new HttpException('Trust registry not found', HttpStatus.NOT_FOUND)
    }

    const items = Object.entries(allMetadata).map(([schemaId, entry]) => ({
      schemaId,
      ...(entry as Record<string, any>),
    }))
    return this.paginate(items, page, limit)
  }

  private paginate<T>(items: T[], page = 1, limit = 10) {
    const totalItems = items.length
    const totalPages = Math.ceil(totalItems / limit)
    const start = (page - 1) * limit
    const end = start + limit

    return {
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      data: items.slice(start, end),
    }
  }

  private async removeTrustCredential(schemaId: string, key: '_vt/vtc' | '_vt/jsc') {
    try {
      const { agent, didRecord } = await this.getDidRecord()
      const record = this.findMetadataEntry(didRecord, key, schemaId)
      // Currently, we only use one serviceEndpoint per ID.
      // In the future, if multiple serviceEndpoints exist for the same ID,
      // we should review the serviceEndpoint content and remove only the specific one.
      if (record?.didDocumentServiceId && didRecord.didDocument?.service) {
        didRecord.didDocument.service = didRecord.didDocument.service.filter(
          s => s.id !== record.didDocumentServiceId,
        )
      }
      await this.deleteMetadataEntry(agent, schemaId, didRecord, key)
      this.logger.log(`Metadata ${schemaId} successfully removed`)
      return { success: true, message: `Metadata ${schemaId} removed` }
    } catch (error) {
      this.handleError(error, 'Failed to remove schema data')
    }
  }

  public async removeVerifiableTrustCredential(schemaId: string) {
    return await this.removeTrustCredential(schemaId, '_vt/vtc')
  }

  public async removeJsonSchemaCredential(schemaId: string) {
    return await this.removeTrustCredential(schemaId, '_vt/jsc')
  }

  public async createVtc(id: string, credential: W3cJsonLdVerifiableCredential) {
    try {
      const { agent, didRecord } = await this.getDidRecord()
      const schemaId = `schemas-${id}-c-vp.json`
      const record = this.findMetadataEntry(didRecord, '_vt/vtc', schemaId)
      const didDocumentServiceId = `${agent.did}#vpr-${schemaId.replace('.json', '')}`
      const serviceEndpoint = `${this.publicApiBaseUrl}/vt/${schemaId}`
      const unsignedPresentation = createPresentation({
        id: serviceEndpoint,
        holder: agent.did,
        verifiableCredential: [credential],
      })

      if (!record) {
        didRecord.didDocument?.service?.push(
          new DidDocumentService({
            id: didDocumentServiceId,
            serviceEndpoint,
            type: 'LinkedVerifiablePresentation',
          }),
        )
      }
      const verifiablePresentation = await signerW3c(
        agent,
        unsignedPresentation,
        getVerificationMethodId(agent.config.logger, didRecord),
      )

      // Update #whois with new endpoint
      const service = didRecord.didDocument?.service?.find(s => s.id === `${agent.did}#whois`)
      if (service) service.serviceEndpoint = serviceEndpoint

      await this.saveMetadataEntry(
        agent,
        didRecord,
        credential,
        verifiablePresentation,
        didDocumentServiceId,
        '_vt/vtc',
      )
      this.logger.log(`Metadata for "${schemaId}" updated successfully.`)
      return verifiablePresentation
    } catch (error) {
      this.handleError(error, 'Error create credential')
    }
  }

  public async createJsc(id: string, jsonSchemaRef: string) {
    try {
      const { agent, didRecord } = await this.getDidRecord()
      const record = this.findMetadataEntry(didRecord, '_vt/jsc', jsonSchemaRef)
      const { id: subjectId, claims } = createJsonSubjectRef(jsonSchemaRef)
      const credentialSubject = {
        id: subjectId,
        claims: await addDigestSRI(subjectId, claims, this.ecsSchemas),
      }
      const schemaPresentation = `schemas-${id}-jsc-vp.json`
      const schemaCredential = `schemas-${id}-jsc.json`
      let unsignedCredential
      if (record) unsignedCredential = record.credential as W3cJsonLdVerifiableCredential

      if (unsignedCredential) {
        delete (unsignedCredential as any).proof
        unsignedCredential.credentialSubject = credentialSubject
      } else {
        unsignedCredential = createCredential({
          id: `${this.publicApiBaseUrl}/vt/${schemaCredential}`,
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

      const verificationMethodId = getVerificationMethodId(agent.config.logger, didRecord)
      const credential = await signerW3c(
        agent,
        JsonTransformer.fromJSON(unsignedCredential, W3cCredential),
        verificationMethodId,
      )

      const serviceEndpoint = `${this.publicApiBaseUrl}/vt/${schemaPresentation}`
      const didDocumentServiceId = `${agent.did}#vpr-${schemaPresentation.replace('.json', '')}`
      const unsignedPresentation = createPresentation({
        id: serviceEndpoint,
        holder: agent.did,
        verifiableCredential: [credential],
      })
      const verifiablePresentation = await signerW3c(
        agent,
        unsignedPresentation,
        getVerificationMethodId(agent.config.logger, didRecord),
      )

      if (!record) {
        didRecord.didDocument?.service?.push(
          new DidDocumentService({
            id: didDocumentServiceId,
            serviceEndpoint,
            type: 'LinkedVerifiablePresentation',
          }),
        )
      }
      await this.saveMetadataEntry(
        agent,
        didRecord,
        credential,
        verifiablePresentation,
        didDocumentServiceId,
        '_vt/jsc',
      )
      return credential.jsonCredential
    } catch (error) {
      this.handleError(error, 'Failed to create schema')
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
      type: ['VerifiableCredential', 'VerifiableTrustCredential'],
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
      this.handleError(error, 'Failed to issue credential')
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

  private handleError(error: any, defaultMsg: string) {
    const message = error?.message ?? String(error)
    this.logger.error(`Error: ${message}`)
    if (error instanceof HttpException) throw error
    throw new HttpException(message || defaultMsg, HttpStatus.INTERNAL_SERVER_ERROR)
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

  private findMetadataEntry(didRecord: DidRecord, key: '_vt/vtc' | '_vt/jsc', id?: string) {
    const metadata = didRecord.metadata.get(key)
    if (!metadata) return null
    if (!id) return { data: metadata }
    for (const [schemaId, entry] of Object.entries(metadata)) {
      const credId = entry.credential?.id
      const presId = entry.verifiablePresentation?.id

      if (credId === id) {
        return { schemaId, ...entry, data: entry.credential }
      }

      if (presId === id) {
        return { schemaId, ...entry, data: entry.verifiablePresentation }
      }
    }
    return null
  }

  private async saveMetadataEntry(
    agent: VsAgent,
    didRecord: DidRecord,
    credential: W3cJsonLdVerifiableCredential,
    verifiablePresentation: W3cJsonLdVerifiablePresentation,
    didDocumentServiceId: string,
    key: '_vt/vtc' | '_vt/jsc',
  ) {
    const schema = key === '_vt/vtc' ? credential.credentialSchema : credential.credentialSubject
    const ref = Array.isArray(schema) ? schema[0]?.id : schema?.id

    if (!ref) {
      throw new HttpException('No ID was found in credentialSubject', HttpStatus.NOT_FOUND)
    }

    const record = didRecord.metadata.get(key) ?? {}
    record[ref] = {
      credential,
      verifiablePresentation,
      didDocumentServiceId,
    }
    didRecord.metadata.set(key, record)
    await this.updateDidRecord(agent, didRecord)
  }

  private async deleteMetadataEntry(
    agent: VsAgent,
    id: string,
    didRecord: DidRecord,
    key: '_vt/vtc' | '_vt/jsc',
  ) {
    const found = this.findMetadataEntry(didRecord, key, id)
    if (!found) return null

    const metadata = didRecord.metadata.get(key)
    if (!metadata) return null

    delete metadata[found.schemaId]
    didRecord.metadata.set(key, metadata)
    await this.updateDidRecord(agent, didRecord)
    return {
      schemaId: found.schemaId,
    }
  }
}
