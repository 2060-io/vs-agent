import type { ServerConfig } from '../utils/ServerConfig'
import type {
  AgentMessageProcessedEvent,
  ConnectionStateChangedEvent,
  DiscoverFeaturesDisclosureReceivedEvent,
} from '@credo-ts/core'

import { ConnectionStateUpdated, ExtendedDidExchangeState } from '@2060.io/service-agent-model'
import {
  AgentEventTypes,
  ConnectionEventTypes,
  ConnectionRepository,
  DidExchangeState,
  DiscoverFeaturesEventTypes,
  HangupMessage,
} from '@credo-ts/core'

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

      if (record.state === DidExchangeState.Completed) {
        await agent.modules.userProfile.requestUserProfile({ connectionId: record.id })
        if (config.discoveryOptions)
          await agent.discovery.queryFeatures({
            connectionId: record.id,
            protocolVersion: 'v2',
            queries: config.discoveryOptions,
        })
      }

      // If discovery is enabled, send an empty 'completed' state so that the recipient knows to expect async features.
      const body = new ConnectionStateUpdated({
        connectionId: record.id,
        invitationId: record.outOfBandId,
        state: record.state,
        metadata: config.discoveryOptions ? {} : undefined,
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

  agent.events.on(
    DiscoverFeaturesEventTypes.DisclosureReceived,
    async ({ payload }: DiscoverFeaturesDisclosureReceivedEvent) => {
      const record = payload.connection
      payload.disclosures.forEach(item =>
        record.metadata.add(`features-${item.type}`, { [item.id]: item.toJSON() }),
      )
      await agent.context.dependencyManager
        .resolve(ConnectionRepository)
        .update(agent.context, payload.connection)

      const metadata = payload.disclosures?.reduce(
        (acc, item) => {
          acc[item.id] = JSON.stringify(item.toJSON())
          return acc
        },
        {} as Record<string, string>,
      )

      const body = new ConnectionStateUpdated({
        connectionId: record.id,
        invitationId: record.outOfBandId,
        state: ExtendedDidExchangeState.Updated,
        metadata,
      })

      await sendWebhookEvent(config.webhookUrl + '/connection-state-updated', body, config.logger)
    },
  )
}
