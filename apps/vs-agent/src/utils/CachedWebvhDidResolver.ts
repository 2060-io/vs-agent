import { AgentContext, DidResolutionResult, DidsApi } from '@credo-ts/core'
import { WebvhDidResolver } from '@credo-ts/webvh'

export class CachedWebvhDidResolver extends WebvhDidResolver {
  public async resolve(agentContext: AgentContext, did: string): Promise<DidResolutionResult> {
    // First check within our own public dids, as there is no need to resolve it through HTTPS
    const didsApi = agentContext.dependencyManager.resolve(DidsApi)
    const [didRecord] = await didsApi.getCreatedDids({ did })

    if (didRecord?.didDocument) {
      return {
        didDocument: didRecord.didDocument,
        didDocumentMetadata: {},
        didResolutionMetadata: {},
      }
    }

    return super.resolve(agentContext, did)
  }
}
