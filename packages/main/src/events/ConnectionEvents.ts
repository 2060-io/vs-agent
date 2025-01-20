import type { ServerConfig } from '../utils/ServerConfig'
import type { AgentMessageProcessedEvent, ConnectionStateChangedEvent } from '@credo-ts/core'

import { Capability } from '@2060.io/credo-ts-didcomm-mrtd/build/models/Capability'
import { ConnectionStateUpdated } from '@2060.io/service-agent-model'
import {
  AgentEventTypes,
  ConnectionEventTypes,
  ConnectionRepository,
  DidExchangeState,
  HangupMessage,
} from '@credo-ts/core'

import { ServiceAgent } from '../utils/ServiceAgent'
import { queries } from '../utils/discovery.config'

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

      let metadata
      if (record.state === DidExchangeState.Completed) {
        await agent.modules.userProfile.requestUserProfile({ connectionId: record.id }) // TODO: maybe it shouldn't be necessary
        const capability = await agent.discovery.queryFeatures({
          connectionId: record.id,
          protocolVersion: 'v2',
          queries,
          awaitDisclosures: true,
        })
        metadata = capability.features?.reduce(
          (acc, feature) => {
            if (feature.type === Capability.type) acc[feature.id] = String((feature as Capability).value)
            return acc
          },
          {} as Record<string, string>,
        )
      }

      const body = new ConnectionStateUpdated({
        connectionId: record.id,
        invitationId: record.outOfBandId,
        state: record.state,
        metadata,
      })

      await sendWebhookEvent(config.webhookUrl + '/connection-state-updated', body, config.logger)
    },
  )

  // When a hangup message is received for a given connection, it will be effectively terminated. Service Agent controller
  // will be notified about this 'termination' status
  agent.events.on(AgentEventTypes.AgentMessageProcessed, async ({ payload }: AgentMessageProcessedEvent) => {
    const { message, connection } = payload

    if (message.type === HangupMessage.type.messageTypeUri && connection) {
      const body = new ConnectionStateUpdated({
        connectionId: connection.id,
        invitationId: connection.outOfBandId,
        state: 'terminated',
      })

      await sendWebhookEvent(config.webhookUrl + '/connection-state-updated', body, config.logger)
    }
  })
}
