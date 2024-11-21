import { VCAuthnEvent } from '@2060.io/service-agent-model'
import { ProofEventTypes, ProofState, ProofStateChangedEvent } from '@credo-ts/core'

import { ServerConfig } from '../utils/ServerConfig'
import { ServiceAgent } from '../utils/ServiceAgent'

import { sendWebhookEvent } from './WebhookEvent'

export const vcAuthnEvents = async (agent: ServiceAgent, config: ServerConfig) => {
  agent.events.on(ProofEventTypes.ProofStateChanged, async ({ payload }: ProofStateChangedEvent) => {
    const record = payload.proofRecord

    // TODO: Convert all states from Credo to ACA-Py
    const stateMap = (state: ProofState): string => {
      if (state === ProofState.PresentationReceived) return 'presentation_received'
      if (state === ProofState.Done) return 'verified'

      return state
    }

    const body = new VCAuthnEvent({
      presentation_exchange_id: record.id,
      state: stateMap(record.state),
      verified: record.isVerified ? 'true' : 'false',
      error_msg: record.errorMessage,
    })

    await sendWebhookEvent(config.webhookUrl + '/topic/present_proof', body, config.logger)
  })
}
