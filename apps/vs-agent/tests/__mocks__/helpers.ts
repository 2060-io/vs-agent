import { ConnectionProfileUpdatedEvent } from '@2060.io/credo-ts-didcomm-user-profile'
import {
  AgentMessageProcessedEvent,
  CredentialStateChangedEvent,
  HandshakeProtocol,
  LogLevel,
} from '@credo-ts/core'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { VsAgentModule } from '../../src/admin.module'
import { messageEvents } from '../../src/events/MessageEvents'
import { PublicModule } from '../../src/public.module'
import { ServerConfig, TsLogger, VsAgent } from '../../src/utils'

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

export function isCredentialStateChangedEvent(arg: unknown): arg is CredentialStateChangedEvent {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    (arg as any).type === 'CredentialStateChanged' &&
    !!(arg as any).payload?.credentialRecord
  )
}

export function isAgentMessageProcessedEvent(arg: unknown): arg is AgentMessageProcessedEvent {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    (arg as any).type === 'AgentMessageProcessed' &&
    !!(arg as any).payload?.message &&
    !!(arg as any).payload?.connection
  )
}

export function isConnectionProfileUpdatedEvent(arg: unknown): arg is ConnectionProfileUpdatedEvent {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    (arg as any).type === 'ConnectionProfileUpdated' &&
    !!(arg as any).payload?.profile &&
    !!(arg as any).payload?.connection
  )
}

export const getMessageByType = <T extends { type: string }>(messages: { type: string }[], type: string) =>
  messages.find(msg => msg.type === type) as T | undefined

export const startServersTesting = async (agent: VsAgent): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      VsAgentModule.register(agent, 'http://localhost:3001'),
      PublicModule.register(agent, 'http://localhost:3001'),
    ],
  }).compile()
  const app = moduleRef.createNestApplication()
  await app.init()

  const conf: ServerConfig = {
    port: 3000,
    logger: new TsLogger(LogLevel.off, agent.config.label),
    publicApiBaseUrl: 'http://localhost:3001',
    webhookUrl: 'http://localhost:5000',
    endpoints: agent.config.endpoints,
  }
  messageEvents(agent, conf)
  return app
}
