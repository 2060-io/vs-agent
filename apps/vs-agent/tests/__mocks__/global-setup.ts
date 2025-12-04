import { vi } from 'vitest'

import { mockResponses } from './object'

const fetchOriginal = global.fetch

vi.stubGlobal('fetch', async (input: any | URL, options?: RequestInit) => {
  const url =
    typeof input === 'string' ? input : ((input as any)?.url ?? input?.toString?.() ?? String(input))

  if (url.includes('witness')) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (mockResponses[url]) {
    const headers = new Headers()
    headers.set('content-type', 'application/ld+json')
    headers.set('access-control-allow-origin', '*')
    return {
      ok: true,
      headers,
      json: async () => mockResponses[url],
      text: async () => JSON.stringify(mockResponses[url]),
    }
  }
  return fetchOriginal(url, options)
})
