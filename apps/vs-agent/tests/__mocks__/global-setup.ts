import { vi } from 'vitest'

const fetchOriginal = global.fetch

global.fetch = vi.fn(async (url: any | URL, init?: RequestInit) => {
  const urlToString = url.toString()

  if (urlToString.includes('witness')) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return fetchOriginal(url, init)
}) as any
