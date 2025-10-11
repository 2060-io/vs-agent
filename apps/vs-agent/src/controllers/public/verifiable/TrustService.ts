import {
  DidDocumentService,
  DidRecord,
  DidRepository,
  JsonObject,
  JsonTransformer,
  W3cCredential,
  W3cPresentation,
} from '@credo-ts/core'
import { Logger, Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { instanceToPlain } from 'class-transformer'

import { ECS_SCHEMA_KEYS } from '../../../config/constants'
import { VsAgentService } from '../../../services/VsAgentService'
import { VsAgent } from '../../../utils/VsAgent'
import { getEcsSchemas } from '../../../utils/data'
import {
  addDigestSRI,
  createCredential,
  createJsonSchema,
  createJsonSubjectRef,
  credentials,
  generateDigestSRI,
  generateVerifiablePresentation,
  getClaims,
  getVerificationMethodId,
  mapToSelfTr,
  presentations,
  signerW3c,
} from '../../../utils/setupSelfTr'

import { OrganizationCredentialDto, ServiceCredentialDto } from './dto'

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

  public async updateSchemaData(
    tagName: (typeof ECS_SCHEMA_KEYS)[number],
    claims: OrganizationCredentialDto | ServiceCredentialDto,
  ) {
    try {
      const { agent, didRecord } = await this.getDidRecord()
      const existingMetadata = didRecord.metadata.get(tagName)

      if (!existingMetadata) {
        const { name, schemaUrl } = presentations.find(({ name }) => name === tagName)!
        return await generateVerifiablePresentation(
          agent,
          this.ecsSchemas,
          name,
          ['VerifiableCredential', 'VerifiableTrustCredential'],
          {
            id: mapToSelfTr(schemaUrl, this.publicApiBaseUrl),
            type: 'JsonSchemaCredential',
          },
        )
      }

      // Split objects and proofs
      const { proof: presentationProof, ...unsignedPresentation } = existingMetadata
      const { proof: credentialProof, ...unsignedCredential } = unsignedPresentation.verifiableCredential[0]

      // Get claims in the right format
      const credentialSubject = await getClaims(
        this.ecsSchemas,
        { id: agent.did, claims: instanceToPlain(claims) },
        tagName,
      )
      unsignedCredential.credentialSubject = credentialSubject
      const integrityData = generateDigestSRI(JSON.stringify(credentialSubject))

      const credential = await signerW3c(
        agent,
        JsonTransformer.fromJSON(unsignedCredential, W3cCredential),
        credentialProof.verificationMethod,
      )
      unsignedPresentation.verifiableCredential = [credential]
      const presentation = await signerW3c(
        agent,
        JsonTransformer.fromJSON(unsignedPresentation, W3cPresentation),
        presentationProof.verificationMethod,
      )

      const linkedServiceIndex = this.findLinkedServiceIndex(didRecord, tagName)
      if (linkedServiceIndex === -1)
        didRecord.didDocument?.service?.push(
          new DidDocumentService({
            id: `${agent.did}#vpr-schemas-${tagName.split('-').pop()}-c-vp`,
            serviceEndpoint: `${this.publicApiBaseUrl}/self-tr/${tagName}-c-vp.json`,
            type: 'LinkedVerifiablePresentation',
          }),
        )
      didRecord.metadata.set(tagName, { ...presentation, integrityData })
      await this.updateDidRecord(agent, didRecord)

      this.logger.log(`Metadata for "${tagName}" updated successfully.`)
      return presentation
    } catch (error) {
      this.logger.error(`Error updating data "${tagName}": ${error.message}`)
      throw new HttpException('Failed to update schema', HttpStatus.INTERNAL_SERVER_ERROR)
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
        unsignedCredential = await createCredential({
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
      this.logger.error(`Error updating data "${id}": ${error.message}`)
      throw new HttpException('Failed to update schema', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  public async issueCredential(did: string, jsonCredschema: string, claims: JsonObject) {
    try {
      const { agent, didRecord } = await this.getDidRecord()
      const unsignedCredential = await createCredential({
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
      this.logger.error(`Error issue issue: ${error.message}`)
      throw new HttpException('Failed to update schema', HttpStatus.INTERNAL_SERVER_ERROR)
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
