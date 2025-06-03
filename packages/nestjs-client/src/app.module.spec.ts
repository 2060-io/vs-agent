import { ApiVersion } from '@2060.io/vs-agent-client'

import { ConnectionsEventModule, EventsModule, MessageEventModule } from '../src'

describe('EventsModule', () => {
  it('should register in EventModule some modules', () => {
    const module = EventsModule.register({
      modules: { messages: true, connections: true, credentials: false },
      options: {
        eventHandler: jest.fn(),
        url: 'http://example.com',
        version: ApiVersion.V1,
      },
    })

    expect(module.imports).toEqual(
      expect.arrayContaining([
        MessageEventModule.forRoot({
          eventHandler: expect.any(Function),
          imports: [],
          url: 'http://example.com',
          version: ApiVersion.V1,
        }),
        ConnectionsEventModule.forRoot({
          eventHandler: expect.any(Function),
          imports: [],
          useMessages: true,
        }),
      ]),
    )
  })

  it('should throw an error if eventHandler is not provided for MessageEventModule or ConnectionsEventModule', () => {
    expect(() => {
      EventsModule.register({
        modules: { messages: true, connections: true, credentials: false },
        options: {
          // eventHandler is missing
          url: 'http://example.com',
          version: ApiVersion.V1,
        },
      })
    }).toThrow(new Error('Event handler is required but not provided.'))
  })
})
