import type { ServerConfig } from '../utils/ServerConfig'
import type { AgentMessageProcessedEvent, ConnectionStateChangedEvent } from '@credo-ts/core'

import { AgentEventTypes, ConnectionEventTypes, ConnectionRepository, HangupMessage } from '@credo-ts/core'

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

  // When a hangup message is received for a given connection, it will be effectively terminated. Service Agent controller
  // will be notified about this 'termination' status
  agent.events.on(AgentEventTypes.AgentMessageProcessed, async ({ payload }: AgentMessageProcessedEvent) => {
    const { message, connection } = payload

    if (message.type === HangupMessage.type.messageTypeUri && connection) {
      const body = {
        type: 'connection-state-updated',
        connectionId: connection.id,
        invitationId: connection.outOfBandId,
        state: 'terminated',
      }

      await sendWebhookEvent(config.webhookUrl + '/connection-state-updated', body, config.logger)
    }
  })
}
