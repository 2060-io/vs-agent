import { CredentialIssuanceMessage } from '@2060.io/vs-agent-model'
import { ConnectionRecord, CredentialEventTypes, CredentialState } from '@credo-ts/core'
import { WebVhAnonCredsRegistry } from '@credo-ts/webvh'
import { INestApplication } from '@nestjs/common'
import { Subject } from 'rxjs'
import request from 'supertest'
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'

import { MessageService, TrustService } from '../src/controllers'
import { VsAgent } from '../src/utils'

import {
  makeConnection,
  mockResponses,
  startAgent,
  startServersTesting,
  SubjectInboundTransport,
  SubjectMessage,
  SubjectOutboundTransport,
  waitForCredentialRecordSubject,
} from './__mocks__'

// Mock Fetch
{
  ;(globalThis as any).__realFetch = globalThis.fetch
}

vi.stubGlobal('fetch', async (url: string, options?: RequestInit) => {
  console.log("FETCH →", url)
  if (mockResponses[url]) {
    return {
      ok: true,
      json: async () => mockResponses[url],
    }
  }
  return (globalThis as any).__realFetch(url, options)
})

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

      faberService = faberApp.get<TrustService>(TrustService)
      faberMsgService = faberApp.get<MessageService>(MessageService)
    })

    afterEach(async () => {
      await faberApp.close()
      await faberAgent.shutdown()
      await faberAgent.wallet.delete()
      await aliceAgent.shutdown()
      await aliceAgent.wallet.delete()
    })

    it('should issue a JSON-LD credential with a valid Ed25519 proof', async () => {
      const credentialResponse = await faberService.issueCredential({
        type: 'jsonld',
        did: 'did:web:example.com',
        jsonSchemaCredential: 'https://example.org/vt/schemas-example-org-jsc.json',
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
      expect(credentialResponse.credential.proof).toEqual(
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

      const credentialResponse = await faberService.issueCredential({
        type: 'anoncreds',
        jsonSchemaCredential: 'https://example.org/vt/schemas-example-org-jsc.json',
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

      const record = await faberMsgService.sendMessage(
        {
          type: 'credential-issuance',
          connectionId: faberConnection.id,
          credentialSchemaId: credentialResponse.credential.credentialExchangeId,
        } as CredentialIssuanceMessage,
        faberConnection,
      )
      const aliceCredentialRecord = await waitForCredentialRecordSubject(
        aliceAgent.events.observable(CredentialEventTypes.CredentialStateChanged),
        {
          threadId: record.id,
          state: CredentialState.OfferReceived,
        },
      )

      expect(aliceCredentialRecord).toEqual(
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
      expect(credentialResponse).toEqual(
        expect.objectContaining({
          status: 200,
          didcommInvitationUrl: expect.any(String),
          credential: expect.objectContaining({
            credentialExchangeId: expect.any(String),
          }),
        }),
      )
    }, 20000)
  })
})
