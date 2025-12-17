import { ConnectionProfileUpdatedEvent } from '@2060.io/credo-ts-didcomm-user-profile'
import {
  AgentMessageProcessedEvent,
  BasicMessage,
  CredentialExchangeRecord,
  CredentialStateChangedEvent,
  HandshakeProtocol,
  LogLevel,
} from '@credo-ts/core'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { vi } from 'vitest'

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
  const { type, payload } = arg as any
  return (
    typeof arg === 'object' &&
    arg !== null &&
    type === 'CredentialStateChanged' &&
    !!payload?.credentialRecord &&
    payload?.credentialRecord.type === CredentialExchangeRecord.type
  )
}

export function isAgentMessageProcessedEvent(arg: unknown): arg is AgentMessageProcessedEvent {
  const { type, payload } = arg as any
  return (
    typeof arg === 'object' &&
    arg !== null &&
    type === 'AgentMessageProcessed' &&
    !!payload?.message &&
    payload?.message.type === BasicMessage.type.messageTypeUri &&
    !!payload?.connection
  )
}

export function isConnectionProfileUpdatedEvent(arg: unknown): arg is ConnectionProfileUpdatedEvent {
  const { type, payload } = arg as any
  return (
    typeof arg === 'object' &&
    arg !== null &&
    type === 'ConnectionProfileUpdated' &&
    !!payload?.profile &&
    !!payload?.connection
  )
}

export function waitForEvent<T>(
  eventEmitter: ReturnType<typeof vi.spyOn>,
  predicate: (event: unknown) => event is T,
): Promise<T> {
  const calls = eventEmitter.mock.calls as unknown[][]
  const existingEvent = calls.flat().find(predicate)
  if (existingEvent) {
    return Promise.resolve(existingEvent)
  }

  return new Promise(resolve => {
    const check = () => {
      const calls = eventEmitter.mock.calls as unknown[][]
      const events = calls.flat()
      const matchedEvent = events.find(predicate)
      if (matchedEvent) {
        resolve(matchedEvent)
      } else {
        setImmediate(check)
      }
    }
    check()
  })
}

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
