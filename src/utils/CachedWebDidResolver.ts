import {
  AgentContext,
  DidResolutionOptions,
  DidResolutionResult,
  DidsApi,
  WebDidResolver,
} from '@credo-ts/core'
import { ParsedDID } from 'did-resolver'

export class CachedWebDidResolver extends WebDidResolver {
  public async resolve(
    agentContext: AgentContext,
    did: string,
    parsed: ParsedDID,
    didResolutionOptions: DidResolutionOptions,
  ): Promise<DidResolutionResult> {
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

    return super.resolve(agentContext, did, parsed, didResolutionOptions)
  }
}
