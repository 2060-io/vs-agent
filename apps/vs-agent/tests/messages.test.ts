import { ConnectionRecord } from '@credo-ts/core'
import { Subject } from 'rxjs'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { VsAgent } from '../src/utils'

import {
  makeConnection,
  startAgent,
  SubjectInboundTransport,
  SubjectMessage,
  SubjectOutboundTransport,
  waitForBasicMessage,
} from './__mocks__'

describe('DidValidator', () => {
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

  describe('resolver method in mocked environment', async () => {
    beforeEach(async () => {
      faberAgent = await startAgent({
        label: 'DID Faber Test',
        domain: 'faber',
      })
      faberAgent.registerInboundTransport(new SubjectInboundTransport(faberMessages))
      faberAgent.registerOutboundTransport(new SubjectOutboundTransport(subjectMap))
      await faberAgent.initialize()

      aliceAgent = await startAgent({
        label: 'DID Alice Test',
        domain: 'alice',
      })
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
      vi.clearAllMocks()
    })

    it('should allow Alice and Faber to exchange a structured conversational flow with VsAgent', async () => {
      const helloRecord = await aliceAgent.basicMessages.sendMessage(aliceConnection.id, 'Hello')
      expect(helloRecord.content).toBe('Hello')

      const msgToFaber = await waitForBasicMessage(faberAgent, {
        content: 'Hello',
      })
      expect(msgToFaber.content).toBe('Hello')

      const replyRecord = await faberAgent.basicMessages.sendMessage(faberConnection.id, 'How are you?')
      expect(replyRecord.content).toBe('How are you?')

      const msgToAlice = await waitForBasicMessage(aliceAgent, {
        content: 'How are you?',
      })
      expect(msgToAlice.content).toBe('How are you?')
    })
  })
})
