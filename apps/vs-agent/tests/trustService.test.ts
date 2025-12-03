import { INestApplication } from '@nestjs/common'
import { Subject } from 'rxjs'
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'

import { TrustService } from '../src/controllers'
import { VsAgent } from '../src/utils'

import {
  mockResponses,
  startAgent,
  startServersTesting,
  SubjectInboundTransport,
  SubjectMessage,
  SubjectOutboundTransport,
} from './__mocks__'

// Mock Fetch
{
  ;(globalThis as any).__realFetch = globalThis.fetch
}

vi.stubGlobal('fetch', async (url: string, options?: RequestInit) => {
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
  const faberMessages = new Subject<SubjectMessage>()
  const subjectMap = {
    'rxjs:faber': faberMessages,
  }
  let faberAgent: VsAgent
  describe('Testing for message exchange with VsAgent', async () => {
    beforeEach(async () => {
      faberAgent = await startAgent({ label: 'Faber Test', domain: 'faber' })
      faberAgent.registerInboundTransport(new SubjectInboundTransport(faberMessages))
      faberAgent.registerOutboundTransport(new SubjectOutboundTransport(subjectMap))
      await faberAgent.initialize()
      faberApp = await startServersTesting(faberAgent)

      faberService = faberApp.get<TrustService>(TrustService)
    })

    afterEach(async () => {
      await faberApp.close()
      await faberAgent.shutdown()
      await faberAgent.wallet.delete()
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
  })
})
