import {
  BasicMessage,
  BasicMessageEventTypes,
  BasicMessageStateChangedEvent,
  HandshakeProtocol,
} from '@credo-ts/core'

import { VsAgent } from '../../src/utils'

export async function makeConnection(agentA: VsAgent, agentB: VsAgent) {
  const agentAOutOfBand = await agentA.oob.createInvitation({
    handshakeProtocols: [HandshakeProtocol.Connections],
  })

  let { connectionRecord: agentBConnection } = await agentB.oob.receiveInvitation(
    agentAOutOfBand.outOfBandInvitation,
  )

  agentBConnection = await agentB.connections.returnWhenIsConnected(agentBConnection!.id)
  let [agentAConnection] = await agentA.connections.findAllByOutOfBandId(agentAOutOfBand.id)
  agentAConnection = await agentA.connections.returnWhenIsConnected(agentAConnection!.id)

  return [agentAConnection, agentBConnection]
}

export async function waitForBasicMessage(
  agent: VsAgent,
  { content, connectionId }: { content?: string; connectionId?: string },
): Promise<BasicMessage> {
  return new Promise(resolve => {
    const listener = (event: BasicMessageStateChangedEvent) => {
      const contentMatches = content === undefined || event.payload.message.content === content
      const connectionIdMatches =
        connectionId === undefined || event.payload.basicMessageRecord.connectionId === connectionId

      if (contentMatches && connectionIdMatches) {
        agent.events.off<BasicMessageStateChangedEvent>(
          BasicMessageEventTypes.BasicMessageStateChanged,
          listener,
        )

        resolve(event.payload.message)
      }
    }

    agent.events.on<BasicMessageStateChangedEvent>(BasicMessageEventTypes.BasicMessageStateChanged, listener)
  })
}
