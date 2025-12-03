import { KeyDerivationMethod, LogLevel, utils } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'

import { createVsAgent, TsLogger } from '../../src/utils'

export const startAgent = async ({ label, domain }: { label: string; domain: string }) => {
  const agent = createVsAgent({
    config: {
      endpoints: [`rxjs:${domain}`],
      walletConfig: getAskarStoreConfig(label, { inMemory: true }),
      label,
      logger: new TsLogger(LogLevel.off, label),
    },
    did: `did:webvh:${domain}`,
    dependencies: agentDependencies,
    publicApiBaseUrl: `https://${domain}`,
  })
  return agent
}

export function getAskarStoreConfig(
  name: string,
  {
    inMemory = true,
    random = utils.uuid().slice(0, 4),
    maxConnections,
  }: { inMemory?: boolean; random?: string; maxConnections?: number } = {},
) {
  return {
    id: `Wallet: ${name} - ${random}`,
    key: 'DZ9hPqFWTPxemcGea72C1X1nusqk5wFNLq6QPjwXGqAa',
    keyDerivationMethod: KeyDerivationMethod.Raw,
    database: {
      type: 'sqlite',
      config: {
        inMemory,
        maxConnections,
      },
    },
  }
}
