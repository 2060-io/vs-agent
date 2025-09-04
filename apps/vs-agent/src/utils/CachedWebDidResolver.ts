import {
  AgentContext,
  DidRepository,
  DidResolutionOptions,
  DidResolutionResult,
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
    const didRepository = agentContext.dependencyManager.resolve(DidRepository)
    const didRecord = await didRepository.findSingleByQuery(agentContext, {
      $or: [
        { did, method: 'web' },
        { domain: parsed.id, method: 'webvh' }, // Find equivalent did:webvh, since this might be a legacy alias
      ],
    })

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
