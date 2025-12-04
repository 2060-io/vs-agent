// __mocks__/fetch.ts

import { vi } from 'vitest'

type MockResponse = {
  ok: boolean
  status?: number
  data: any
}

type MockConfig = {
  [url: string]: MockResponse
}

export class FetchMocker {
  private mockConfig: MockConfig = {}
  private originalFetch: typeof global.fetch

  constructor() {
    this.originalFetch = global.fetch
  }

  // Configure responses for specific URLs
  setMockResponses(config: MockConfig) {
    this.mockConfig = config
  }

  // Add an individual response
  addMockResponse(url: string, response: MockResponse) {
    this.mockConfig[url] = response
  }

  // Enable the mock
  enable() {
    global.fetch = vi.fn(this.mockImplementation.bind(this))
  }

  // Disable the mock and restore the original fetch
  disable() {
    global.fetch = this.originalFetch
  }

  // Mock implementation
  private async mockImplementation(url: string): Promise<Response> {
    if (url in this.mockConfig) {
      const mockRes = this.mockConfig[url]

      return Promise.resolve({
        ok: mockRes.ok,
        status: mockRes.status || (mockRes.ok ? 200 : 400),
        json: () => Promise.resolve(mockRes.data),
        text: () => Promise.resolve(JSON.stringify(mockRes.data)),
        headers: new Headers(),
      } as Response)
    }

    // Unrecognized URL, return a default error
    try {
      return await this.originalFetch(url)
    } catch {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: `URL not mocked: ${url}` }),
        text: () => Promise.resolve(JSON.stringify({ error: `URL not mocked: ${url}` })),
        headers: new Headers(),
      } as Response)
    }
  }

  // Reset the mock
  reset() {
    this.mockConfig = {}
    ;(global.fetch as any)?.mockClear()
  }
}

// Export a default instance for easier usage
export const fetchMocker = new FetchMocker()

// Also export a convenience function to quickly set up mocks
export function setupFetchMocks(config: MockConfig): FetchMocker {
  fetchMocker.setMockResponses(config)
  fetchMocker.enable()
  return fetchMocker
}
