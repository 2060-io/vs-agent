import { DidRecord, DidRepository, JsonTransformer, W3cCredential, W3cPresentation } from '@credo-ts/core'
import { Logger, Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { instanceToPlain } from 'class-transformer'

import { VsAgentService } from '../../../services/VsAgentService'
import { VsAgent } from '../../../utils/VsAgent'
import { getEcsSchemas } from '../../../utils/data'
import { generateDigestSRI, getClaims, signerW3c } from '../../../utils/setupSelfTr'

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
      if (metadata) {
        const { integrityData, ...rest } = metadata
        void integrityData
        return rest
      }

      throw new HttpException(notFoundMessage, HttpStatus.NOT_FOUND)
    } catch (error) {
      this.handleError('loading', tagName, error, 'Failed to load schema')
    }
  }

  public async removeSchemaData(tagName: string) {
    try {
      const { agent, didRecord } = await this.getDidRecord()
      const metadata = didRecord.metadata.get(tagName)
      if (!metadata) {
        throw new HttpException(`Metadata with tag "${tagName}" not found`, HttpStatus.NOT_FOUND)
      }

      didRecord.metadata.delete(tagName)
      await this.updateDidRecord(agent, didRecord)

      this.logger.log(`Metadata ${tagName} successfully removed`)
      return { success: true, message: `Metadata ${tagName} removed` }
    } catch (error) {
      this.handleError('removing', tagName, error, 'Failed to remove schema data')
    }
  }

  public async updateSchemaData(tagName: string, claims: OrganizationCredentialDto | ServiceCredentialDto) {
    try {
      const { agent, didRecord } = await this.getDidRecord()

      // Split objects and proofs
      const { proof: presentationProof, ...unsignedPresentation } = didRecord.metadata.get(tagName) || {}
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

      didRecord.metadata.set(tagName, { ...presentation, integrityData })
      await this.updateDidRecord(agent, didRecord)

      this.logger.log(`Metadata for "${tagName}" updated successfully.`)
      return presentation
    } catch (error) {
      this.logger.error(`Error updating data "${tagName}": ${error.message}`)
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
    throw new HttpException(defaultMsg, HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
