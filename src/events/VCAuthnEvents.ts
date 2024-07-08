import { ProofEventTypes, ProofStateChangedEvent } from '@credo-ts/core'

import { ServerConfig } from '../utils/ServerConfig'
import { ServiceAgent } from '../utils/ServiceAgent'

import { sendWebhookEvent } from './WebhookEvent'

export const vcAuthnEvents = async (agent: ServiceAgent, config: ServerConfig) => {
  agent.events.on(ProofEventTypes.ProofStateChanged, async ({ payload }: ProofStateChangedEvent) => {
    const record = payload.proofRecord

    const body = {
      presentation_exchange_id: record.id,
      state: record.state,
      verified: record.isVerified ?? false,
      error_msg: record.errorMessage,
    }

    await sendWebhookEvent(config.webhookUrl + '/topics/present_proof', body, config.logger)
  })
}
