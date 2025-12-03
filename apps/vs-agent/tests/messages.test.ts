import { ContextualMenuUpdateMessage, TextMessage } from '@2060.io/vs-agent-model'
import { ActionMenuRole, ActionMenuState } from '@credo-ts/action-menu'
import { ConnectionRecord } from '@credo-ts/core'
import { INestApplication } from '@nestjs/common'
import { Subject } from 'rxjs'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { MessageService } from '../src/controllers'
import { VsAgent } from '../src/utils'

import {
  actionMenu,
  makeConnection,
  startAgent,
  startServersTesting,
  SubjectInboundTransport,
  SubjectMessage,
  SubjectOutboundTransport,
  waitForActionMenuRecord,
  waitForBasicMessage,
} from './__mocks__'

describe('Messages', () => {
  let faberApp: INestApplication
  let aliceApp: INestApplication
  let faberService: MessageService
  let aliceService: MessageService
  const faberMessages = new Subject<SubjectMessage>()
  const aliceMessages = new Subject<SubjectMessage>()
  const subjectMap = {
    'rxjs:faber': faberMessages,
    'rxjs:alice': aliceMessages,
  }
  let faberAgent: VsAgent
  let aliceAgent: VsAgent
  let faberConnection: ConnectionRecord
  let aliceConnection: ConnectionRecord

  describe('Testing for message exchange with VsAgent', async () => {
    beforeEach(async () => {
      faberAgent = await startAgent({ label: 'Faber Test', domain: 'faber' })
      faberAgent.registerInboundTransport(new SubjectInboundTransport(faberMessages))
      faberAgent.registerOutboundTransport(new SubjectOutboundTransport(subjectMap))
      await faberAgent.initialize()
      faberApp = await startServersTesting(faberAgent)

      aliceAgent = await startAgent({ label: 'Alice Test', domain: 'alice' })
      aliceAgent.registerInboundTransport(new SubjectInboundTransport(aliceMessages))
      aliceAgent.registerOutboundTransport(new SubjectOutboundTransport(subjectMap))
      await aliceAgent.initialize()
      ;[aliceConnection, faberConnection] = await makeConnection(aliceAgent, faberAgent)
      aliceApp = await startServersTesting(aliceAgent)

      faberService = faberApp.get<MessageService>(MessageService)
      aliceService = aliceApp.get<MessageService>(MessageService)
    })

    afterEach(async () => {
      await faberApp.close()
      await aliceApp.close()
      await faberAgent.shutdown()
      await faberAgent.wallet.delete()
      await aliceAgent.shutdown()
      await aliceAgent.wallet.delete()
    })

    it('should allow Alice and Faber to exchange a structured conversational flow.', async () => {
      await aliceService.sendMessage(
        { type: 'text', content: 'Hello', connectionId: aliceConnection.id } as TextMessage,
        aliceConnection,
      )
      const msgToFaber = await waitForBasicMessage(faberAgent, {
        content: 'Hello',
      })

      await faberService.sendMessage(
        { type: 'text', content: 'How are you?', connectionId: faberConnection.id } as TextMessage,
        faberConnection,
      )
      const msgToAlice = await waitForBasicMessage(aliceAgent, {
        content: 'How are you?',
      })

      // Receiving messages
      expect(msgToFaber.content).toBe('Hello')
      expect(msgToAlice.content).toBe('How are you?')
    })

    it('Should Faber send an action menu message to Alice and her answer it.', async () => {
      await faberService.sendMessage(
        {
          type: 'contextual-menu-update',
          connectionId: faberConnection.id,
          ...actionMenu,
        } as ContextualMenuUpdateMessage,
        faberConnection,
      )
      const aliceActionMenuRecord = await waitForActionMenuRecord(aliceAgent, {
        state: ActionMenuState.PreparingSelection,
      })
      expect(aliceActionMenuRecord.menu).toEqual({
        title: actionMenu.title,
        description: actionMenu.description,
        options: actionMenu.options.map((opt: any) => ({
          name: opt.id,
          title: opt.title,
          description: opt.description,
        })),
      })

      const faberActiveMenu = await faberAgent.modules.actionMenu.findActiveMenu({
        connectionId: faberConnection.id,
        role: ActionMenuRole.Responder,
      })
      expect(faberActiveMenu?.state).toBe(ActionMenuState.AwaitingSelection)

      await aliceAgent.modules.actionMenu.performAction({
        connectionId: aliceConnection.id,
        performedAction: { name: 'option_1' },
      })
      await waitForActionMenuRecord(faberAgent, {
        state: ActionMenuState.Done,
      })
    })
  })
})
