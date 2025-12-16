import { ConnectionProfileUpdatedEvent } from '@2060.io/credo-ts-didcomm-user-profile'
import {
  AgentMessage,
  AgentMessageProcessedEvent,
  BaseEvent,
  CredentialEventTypes,
  CredentialState,
  CredentialStateChangedEvent,
  HandshakeProtocol,
  LogLevel,
} from '@credo-ts/core'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { catchError, filter, firstValueFrom, map, Observable, ReplaySubject, timeout } from 'rxjs'

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

const isCredentialStateChangedEvent = (e: BaseEvent): e is CredentialStateChangedEvent =>
  e.type === CredentialEventTypes.CredentialStateChanged

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

export const getMessageByType = <T extends AgentMessage>(messages: AgentMessage[], type: string) =>
  messages.find(msg => msg.type === type) as T | undefined

export function waitForCredentialRecordSubject(
  subject: ReplaySubject<BaseEvent> | Observable<BaseEvent>,
  {
    threadId,
    state,
    previousState,
    timeoutMs = 15000,
  }: {
    threadId?: string
    state?: CredentialState
    previousState?: CredentialState | null
    timeoutMs?: number
  },
) {
  const observable = subject instanceof ReplaySubject ? subject.asObservable() : subject

  return firstValueFrom(
    observable.pipe(
      filter(isCredentialStateChangedEvent),
      filter(e => previousState === undefined || e.payload.previousState === previousState),
      filter(e => threadId === undefined || e.payload.credentialRecord.threadId === threadId),
      filter(e => state === undefined || e.payload.credentialRecord.state === state),
      timeout(timeoutMs),
      catchError(() => {
        throw new Error(`CredentialStateChanged event not emitted within specified timeout: {
  previousState: ${previousState},
  threadId: ${threadId},
  state: ${state}
}`)
      }),
      map(e => e.payload.credentialRecord),
    ),
  )
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
