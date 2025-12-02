import { ActionMenuRole, ActionMenuState } from '@credo-ts/action-menu'
import { ConnectionRecord } from '@credo-ts/core'
import { Subject } from 'rxjs'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { HttpInboundTransport, VsAgent } from '../src/utils'

import {
  actionMenu,
  makeConnection,
  startAgent,
  SubjectInboundTransport,
  SubjectMessage,
  SubjectOutboundTransport,
  waitForActionMenuRecord,
  waitForBasicMessage,
} from './__mocks__'

describe('Messages', () => {
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

      aliceAgent = await startAgent({ label: 'Alice Test', domain: 'alice' })
      aliceAgent.registerInboundTransport(new SubjectInboundTransport(aliceMessages))
      aliceAgent.registerOutboundTransport(new SubjectOutboundTransport(subjectMap))
      await aliceAgent.initialize()
      ;[aliceConnection, faberConnection] = await makeConnection(aliceAgent, faberAgent)
    })

    afterEach(async () => {
      await faberAgent.shutdown()
      await faberAgent.wallet.delete()
      await aliceAgent.shutdown()
      await aliceAgent.wallet.delete()
    })

    it('should allow Alice and Faber to exchange a structured conversational flow.', async () => {
      const helloRecord = await aliceAgent.basicMessages.sendMessage(aliceConnection.id, 'Hello')
      const msgToFaber = await waitForBasicMessage(faberAgent, {
        content: 'Hello',
      })

      const replyRecord = await faberAgent.basicMessages.sendMessage(faberConnection.id, 'How are you?')
      const msgToAlice = await waitForBasicMessage(aliceAgent, {
        content: 'How are you?',
      })

      // Sending messages
      expect(helloRecord.content).toBe('Hello')
      expect(replyRecord.content).toBe('How are you?')

      // Receiving messages
      expect(msgToFaber.content).toBe('Hello')
      expect(msgToAlice.content).toBe('How are you?')
    })

    it('Should Faber send an action menu message to Alice and her answer it.', async () => {
      await faberAgent.modules.actionMenu.clearActiveMenu({
        connectionId: faberConnection.id,
        role: ActionMenuRole.Responder,
      })
      await faberAgent.modules.actionMenu.sendMenu({
        connectionId: faberConnection.id,
        menu: actionMenu,
      })

      const aliceActionMenuRecord = await waitForActionMenuRecord(aliceAgent, {
        state: ActionMenuState.PreparingSelection,
      })
      expect(aliceActionMenuRecord.menu).toEqual(actionMenu)

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
