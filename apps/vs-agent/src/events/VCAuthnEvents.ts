import { VCAuthnEvent } from '@2060.io/vs-agent-model'
import { DidCommProofEventTypes, DidCommProofStateChangedEvent, DidCommProofState } from '@credo-ts/didcomm'

import { ServerConfig, VsAgent } from '../utils'

import { sendWebhookEvent } from './WebhookEvent'

export const vcAuthnEvents = async (agent: VsAgent, config: ServerConfig) => {
  agent.events.on(
    DidCommProofEventTypes.ProofStateChanged,
    async ({ payload }: DidCommProofStateChangedEvent) => {
      const record = payload.proofRecord

      // TODO: Convert all states from Credo to ACA-Py
      const stateMap = (state: DidCommProofState): string => {
        if (state === DidCommProofState.PresentationReceived) return 'presentation_received'
        if (state === DidCommProofState.Done) return 'verified'

        return state
      }

      const body = new VCAuthnEvent({
        presentation_exchange_id: record.id,
        state: stateMap(record.state),
        verified: record.isVerified ? 'true' : 'false',
        error_msg: record.errorMessage,
      })

      await sendWebhookEvent(config.webhookUrl + '/topic/present_proof', body, config.logger)
    },
  )
}
