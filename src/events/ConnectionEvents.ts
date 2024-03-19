import type { ServerConfig } from '../utils/ServerConfig'
import type { ConnectionStateChangedEvent } from '@credo-ts/core'

import { ConnectionEventTypes, ConnectionRepository } from '@credo-ts/core'

import { ServiceAgent } from '../utils/ServiceAgent'

import { sendWebhookEvent } from './WebhookEvent'

export const connectionEvents = async (agent: ServiceAgent, config: ServerConfig) => {
  agent.events.on(
    ConnectionEventTypes.ConnectionStateChanged,
    async ({ payload }: ConnectionStateChangedEvent) => {
      const record = payload.connectionRecord

      if (record.outOfBandId && !record.getTag('parentConnectionId')) {
        const outOfBandRecord = await agent.oob.getById(record.outOfBandId)
        const parentConnectionId = outOfBandRecord.getTag('parentConnectionId') as string

        // Tag connection with its parent
        if (parentConnectionId) {
          record.setTag('parentConnectionId', parentConnectionId)
          await agent.context.dependencyManager.resolve(ConnectionRepository).update(agent.context, record)
        }
      }

      const body = {
        type: 'connection-state-updated',
        connectionId: record.id,
        invitationId: record.outOfBandId,
        state: record.state,
      }

      await sendWebhookEvent(config.webhookUrl + '/connection-state-updated', body, config.logger)
    },
  )
}
