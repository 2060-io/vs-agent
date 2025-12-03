import {
  ActionMenuEventTypes,
  ActionMenuRole,
  ActionMenuState,
  ActionMenuStateChangedEvent,
} from '@credo-ts/action-menu'
import {
  BasicMessage,
  BasicMessageEventTypes,
  BasicMessageStateChangedEvent,
  HandshakeProtocol,
} from '@credo-ts/core'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { catchError, filter, firstValueFrom, map, timeout } from 'rxjs'

import { VsAgentModule } from '../../src/admin.module'
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

export async function waitForActionMenuRecord(
  agent: VsAgent,
  {
    threadId,
    role,
    state,
    previousState,
    timeoutMs = 10000,
  }: {
    threadId?: string
    role?: ActionMenuRole
    state?: ActionMenuState
    previousState?: ActionMenuState | null
    timeoutMs?: number
  },
) {
  const observable = agent.events.observable<ActionMenuStateChangedEvent>(
    ActionMenuEventTypes.ActionMenuStateChanged,
  )
  return firstValueFrom(
    observable.pipe(
      filter(e => previousState === undefined || e.payload.previousState === previousState),
      filter(e => threadId === undefined || e.payload.actionMenuRecord.threadId === threadId),
      filter(e => role === undefined || e.payload.actionMenuRecord.role === role),
      filter(e => state === undefined || e.payload.actionMenuRecord.state === state),
      timeout(timeoutMs),
      catchError(() => {
        throw new Error(
          `ActionMenuStateChangedEvent event not emitted within specified timeout: {
    previousState: ${previousState},
    threadId: ${threadId},
    state: ${state}
  }`,
        )
      }),
      map(e => e.payload.actionMenuRecord),
    ),
  )
}

export const startServersTesting = async (agent: VsAgent): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [VsAgentModule.register(agent, 'http://localhost:3000')],
  }).compile()
  const app = moduleRef.createNestApplication()
  await app.init()
  return app
}
