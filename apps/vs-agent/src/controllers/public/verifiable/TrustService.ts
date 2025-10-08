import { DidRepository } from '@credo-ts/core'
import { Logger, Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common'

import { VsAgentService } from '../../../services/VsAgentService'
import { getEcsSchemas } from '../../../utils/data'

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
      const agent = await this.agentService.getAgent()
      const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })

      const metadata = didRecord.metadata.get(tagName)
      if (metadata) {
        const { integrityData, ...rest } = metadata
        void integrityData
        return rest
      }

      throw new HttpException(notFoundMessage, HttpStatus.NOT_FOUND)
    } catch (error) {
      this.logger.error(`Error loading data "${tagName}": ${error.message}`)
      throw new HttpException('Failed to load schema', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  public async updateSchemaData(tagName: string, updates: Record<string, any>) {
    try {
      const agent = await this.agentService.getAgent()
      const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })

      const currentMetadata = didRecord.metadata.get(tagName) || {}

      const newMetadata = {
        ...currentMetadata,
        ...updates,
      }

      didRecord.metadata.set(tagName, newMetadata)

      await agent.context.dependencyManager.resolve(DidRepository).update(agent.context, didRecord)

      this.logger.log(`Metadata for "${tagName}" updated successfully.`)
      return newMetadata
    } catch (error) {
      this.logger.error(`Error updating data "${tagName}": ${error.message}`)
      throw new HttpException('Failed to update schema', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
