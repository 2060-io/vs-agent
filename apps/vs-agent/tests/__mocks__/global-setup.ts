import { vi } from 'vitest'

const fetchOriginal = global.fetch

global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const urlToString = url.toString()

  if (urlToString.includes('witness')) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return fetchOriginal(url, init)
}) as any

vi.mock('didwebvh-ts', async () => {
  const actual = await vi.importActual<typeof import('didwebvh-ts')>('didwebvh-ts')

  return {
    ...actual,
    fetchWitnessProofs: vi.fn().mockResolvedValue([]),
    resolveDIDFromLog2: vi.fn().mockImplementation(async (log: any) => {
      return {
        didDocument: actual.resolveDIDFromLog2
          ? await actual.resolveDIDFromLog2(log).catch(() => ({ id: 'did:mock' }))
          : { id: 'did:mock' },
        metadata: {},
      }
    }),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateDID: vi.fn().mockImplementation(async (_did: any) => {
      return { success: true }
    }),
  }
})

const ignoredErrors = ['Error fetching witness proofs', 'fetch failed', 'getaddrinfo EAI_AGAIN', 'EAI_AGAIN']

const shouldIgnoreError = (err: any): boolean => {
  const message = err?.message ?? err?.toString?.() ?? ''
  return ignoredErrors.some(ignored => message.includes(ignored))
}

process.on('uncaughtException', err => {
  if (!shouldIgnoreError(err)) {
    throw err
  }
})

process.on('unhandledRejection', (reason: any) => {
  if (!shouldIgnoreError(reason)) {
    throw reason
  }
})
