import {
  DidDocumentService,
  DidRecord,
  DidRepository,
  JsonObject,
  JsonTransformer,
  W3cCredential,
  W3cJsonLdVerifiableCredential,
} from '@credo-ts/core'
import { Logger, Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common'

import { VsAgentService } from '../../../services/VsAgentService'
import { VsAgent } from '../../../utils/VsAgent'
import { getEcsSchemas } from '../../../utils/data'
import {
  addDigestSRI,
  createCredential,
  createJsonSchema,
  createJsonSubjectRef,
  createPresentation,
  credentials,
  generateDigestSRI,
  getVerificationMethodId,
  mapToSelfTr,
  signerW3c,
} from '../../../utils/setupSelfTr'

@Injectable()
export class TrustService {
  private readonly logger = new Logger(TrustService.name)
  private ecsSchemas

  constructor(
    private readonly agentService: VsAgentService,
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
      const linkedServiceIndex = this.findLinkedServiceIndex(didRecord, tagName)
      const metadata = didRecord.metadata.get(tagName)
      if (!metadata || linkedServiceIndex === -1) {
        throw new HttpException(`Not found data with tag ${tagName}`, HttpStatus.NOT_FOUND)
      }

      didRecord.didDocument?.service?.splice(linkedServiceIndex, 1)
      didRecord.metadata.delete(tagName)
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
      const serviceEndpoint = `${this.publicApiBaseUrl}/self-tr/${schemaKey}-c-vp.json`
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
      const presentation = await signerW3c(agent, unsignedPresentation, getVerificationMethodId(didRecord))

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
      const tag = credentials.find(({ name }) => id.includes(name))
      if (!tag) {
        throw new HttpException(`Credential with id "${id}" not found`, HttpStatus.NOT_FOUND)
      }

      const metadata = didRecord.metadata.get(tag.name)
      if (!metadata) {
        throw new HttpException(`Metadata for credential "${tag.name}" not found`, HttpStatus.NOT_FOUND)
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
      const tag = credentials.find(({ name }) => id.includes(name))
      if (!tag) {
        throw new HttpException(`No credential tag found for id "${id}`, HttpStatus.NOT_FOUND)
      }
      const metadata = didRecord.metadata.get(tag.name)
      if (!metadata) {
        throw new HttpException(`Metadata with tag "${tag.name}" not found`, HttpStatus.NOT_FOUND)
      }

      didRecord.metadata.delete(tag.name)
      await this.updateDidRecord(agent, didRecord)

      this.logger.log(`Metadata ${tag.name} successfully removed`)
      return { success: true, message: `Metadata ${tag.name} removed` }
    } catch (error) {
      this.handleError('removing', id, error, 'Failed to remove schema data')
    }
  }

  public async updateJsonCredential(id: string, jsonSchemaRef?: string) {
    try {
      const { agent, didRecord } = await this.getDidRecord()
      const tag = credentials.find(({ name }) => id.includes(name))

      if (!tag && !jsonSchemaRef) {
        throw new HttpException(
          'Either example credential or JSON Schema reference is required',
          HttpStatus.BAD_REQUEST,
        )
      }

      let unsignedCredential: any
      let verificationMethodId: string
      let integrityData: string | undefined

      if (tag) {
        const { proof: credentialProof, ...existing } = didRecord.metadata.get(tag.name) || {}
        const ref = jsonSchemaRef ?? mapToSelfTr(tag.credUrl, this.publicApiBaseUrl)
        existing.credentialSubject.id = ref
        existing.credentialSubject.jsonSchema.$ref = ref
        unsignedCredential = existing
        verificationMethodId = credentialProof.verificationMethod
        integrityData = generateDigestSRI(JSON.stringify(unsignedCredential.credentialSubject))
      } else {
        const { id: subjectId, claims } = createJsonSubjectRef(jsonSchemaRef!)
        unsignedCredential = createCredential({
          id,
          type: ['VerifiableCredential', 'JsonSchemaCredential'],
          issuer: agent.did,
          credentialSubject: {
            id: subjectId,
            claims: await addDigestSRI(subjectId, claims, this.ecsSchemas),
          },
        })
        unsignedCredential.credentialSchema = await addDigestSRI(
          createJsonSchema.id,
          createJsonSchema,
          this.ecsSchemas,
        )
        verificationMethodId = getVerificationMethodId(didRecord)
      }

      const credential = await signerW3c(
        agent,
        JsonTransformer.fromJSON(unsignedCredential, W3cCredential),
        verificationMethodId,
      )

      if (tag && integrityData) {
        didRecord.metadata.set(tag.name, { ...credential, integrityData })
      }

      await this.updateDidRecord(agent, didRecord)
      return credential
    } catch (error) {
      this.handleError('updating', id, error, 'Failed to update schema')
    }
  }

  public async issueCredential(did: string, jsonCredschema: string, claims: JsonObject) {
    try {
      const { agent, didRecord } = await this.getDidRecord()
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
        id: jsonCredschema,
        type: 'JsonSchemaCredential',
      }
      const verificationMethodId = getVerificationMethodId(didRecord)
      const credential = await signerW3c(
        agent,
        JsonTransformer.fromJSON(unsignedCredential, W3cCredential),
        verificationMethodId,
      )
      return credential.jsonCredential
    } catch (error) {
      this.handleError('updating', did, error, 'Failed to update schema')
    }
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
    this.logger.error(`Error ${action} metadata "${tagName}": ${error.message}`)
    if (error instanceof HttpException) throw error
    throw new HttpException(defaultMsg, HttpStatus.INTERNAL_SERVER_ERROR)
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
}
