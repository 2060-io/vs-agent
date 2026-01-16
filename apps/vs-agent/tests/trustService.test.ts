import { Claim, CredentialIssuanceMessage } from '@2060.io/vs-agent-model'
import { DidCommConnectionRecord } from '@credo-ts/didcomm'
import { WebVhAnonCredsRegistry } from '@credo-ts/webvh'
import { INestApplication } from '@nestjs/common'
import { Subject } from 'rxjs'
import request from 'supertest'
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'

import { MessageService, TrustService } from '../src/controllers'
import { VsAgent } from '../src/utils'

import {
  isCredentialStateChangedEvent,
  makeConnection,
  startAgent,
  startServersTesting,
  SubjectInboundTransport,
  SubjectMessage,
  SubjectOutboundTransport,
  waitForEvent,
} from './__mocks__'

describe('TrustService', () => {
  let faberApp: INestApplication
  let faberService: TrustService
  let faberMsgService: MessageService
  const faberMessages = new Subject<SubjectMessage>()
  const aliceMessages = new Subject<SubjectMessage>()
  const subjectMap = {
    'rxjs:faber': faberMessages,
    'rxjs:alice': aliceMessages,
  }
  let faberAgent: VsAgent
  let aliceAgent: VsAgent
  let faberConnection: DidCommConnectionRecord
  let aliceConnection: DidCommConnectionRecord
  let aliceEvents: ReturnType<typeof vi.spyOn>

  describe('Testing for message exchange with VsAgent', async () => {
    beforeEach(async () => {
      faberAgent = await startAgent({ label: 'Faber Test', domain: 'faber' })
      await faberAgent.initialize()
      faberApp = await startServersTesting(faberAgent)

      aliceAgent = await startAgent({ label: 'Alice Test', domain: 'alice' })
      await aliceAgent.initialize()
      ;[aliceConnection, faberConnection] = await makeConnection(aliceAgent, faberAgent)
      aliceEvents = vi.spyOn(aliceAgent.events, 'emit')
      await startServersTesting(aliceAgent)

      faberService = faberApp.get<TrustService>(TrustService)
      faberMsgService = faberApp.get<MessageService>(MessageService)
    })

    afterEach(async () => {
      await faberApp.close()
      await faberAgent.shutdown()
      await faberAgent.wallet.delete()
      await aliceAgent.shutdown()
      await aliceAgent.wallet.delete()
      vi.restoreAllMocks()
    })

    it('should issue a JSON-LD credential with a valid Ed25519 proof', async () => {
      const credentialResponse = await faberService.issueCredential({
        format: 'jsonld',
        did: 'did:web:example.com',
        jsonSchemaCredentialId: 'https://example.org/vt/schemas-example-org-jsc.json',
        claims: {
          id: 'https://example.org/org/123',
          name: 'OpenAI Research',
          logo: 'https://example.com/logo.png',
          registryId: 'REG-123',
          registryUrl: 'https://registry.example.org',
          address: '123 Main St, San Francisco, CA',
          type: 'PRIVATE',
          countryCode: 'US',
        },
      })
      expect(credentialResponse.credential!.proof).toEqual(
        expect.objectContaining({
          type: 'Ed25519Signature2020',
          verificationMethod: expect.any(String),
          created: expect.any(String),
          proofPurpose: 'assertionMethod',
          proofValue: expect.any(String),
        }),
      )
    })

    it('should issue a valid anoncreds credential', async () => {
      // Mocks
      const original = WebVhAnonCredsRegistry.prototype['_resolveAndValidateAttestedResource']
      vi.spyOn(
        WebVhAnonCredsRegistry.prototype as any,
        '_resolveAndValidateAttestedResource',
      ).mockImplementation(async function (...args: any[]) {
        const resourceId = args[1]
        if (resourceId.includes(':faber/')) {
          const cid = resourceId.split('/').pop()
          const res = await request(faberApp.getHttpServer()).get(`/resources/${cid}`)
          if (res.status !== 200) {
            throw new Error(`resource ${cid} not found in test server`)
          }
          return {
            resolutionResult: {
              content: res.body,
            },
            resourceObject: res.body,
          }
        }
        return original.call(this, ...args)
      })

      const claims = {
        id: 'https://example.org/org/123',
        name: 'OpenAI Research',
        logo: 'https://example.com/logo.png',
        registryId: 'REG-123',
        registryUrl: 'https://registry.example.org',
        address: '123 Main St, San Francisco, CA',
        type: 'PRIVATE',
        countryCode: 'US',
      }
      const credentialResponse = await faberService.issueCredential({
        format: 'anoncreds',
        jsonSchemaCredentialId: 'https://example.org/vt/schemas-example-org-jsc.json',
        claims,
      })

      // Create wait event
      const alicePromise = waitForEvent(aliceEvents, isCredentialStateChangedEvent)

      const record = await faberMsgService.sendMessage(
        {
          type: 'credential-issuance',
          connectionId: faberConnection.id,
          claims: Object.entries(claims).map(([name, value]) => new Claim({ name, value: String(value) })),
          jsonSchemaCredentialId: credentialResponse.jsonSchemaCredentialId,
        } as CredentialIssuanceMessage,
        faberConnection,
      )

      // Receiving messages
      const {
        payload: { credentialRecord },
      } = await alicePromise

      // expects
      expect(credentialRecord).toEqual(
        expect.objectContaining({
          state: 'offer-received',
          connectionId: aliceConnection.id,
          type: 'CredentialRecord',
          role: 'holder',
          protocolVersion: 'v2',
          id: expect.any(String),
          threadId: expect.any(String),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      )
      expect(record.id).toEqual(credentialRecord.threadId)
      expect(credentialResponse).toEqual(
        expect.objectContaining({
          status: 200,
          didcommInvitationUrl: expect.any(String),
          jsonSchemaCredentialId: expect.any(String),
        }),
      )
    }, 20000)
  })
})
