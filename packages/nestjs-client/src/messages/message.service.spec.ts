import { MessageState } from '@2060.io/credo-ts-didcomm-receipts'
import { DidCommCredentialState } from '@credo-ts/didcomm'
import { Test, TestingModule } from '@nestjs/testing'
import { ApiVersion } from '@verana-labs/vs-agent-client'
import {
  CredentialReceptionMessage,
  MessageReceived,
  ProfileMessage,
  TextMessage,
} from '@verana-labs/vs-agent-model'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  ConnectionsEventService,
  ConnectionsRepository,
  CredentialService,
  EventHandler,
  MessageEventService,
} from '../../src'

const mockSend = vi.fn().mockResolvedValue({ id: 'mocked-id' })
vi.mock('@verana-labs/vs-agent-client', () => {
  return {
    ApiClient: vi.fn().mockImplementation(function () {
      return {
        messages: {
          send: mockSend,
        },
      }
    }),
    ApiVersion: {
      V1: 'v1',
    },
  }
})

describe('MessageEventService', () => {
  let service: MessageEventService
  let mockCredentialService: Partial<CredentialService>
  let mockEventHandler: Partial<EventHandler>
  let mockConnectionsRepository: Partial<ConnectionsRepository>
  let mockConnectionsEventService: Partial<ConnectionsEventService>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockCredentialService = {
      handleAcceptance: vi.fn(),
      handleRejection: vi.fn(),
    }

    mockEventHandler = {
      inputMessage: vi.fn(),
    }

    mockConnectionsRepository = {
      updateUserProfile: vi.fn(),
    }

    mockConnectionsEventService = {
      handleNewConnection: vi.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageEventService,
        {
          provide: 'GLOBAL_MODULE_OPTIONS',
          useValue: { url: 'http://example.com', version: ApiVersion.V1 },
        },
        {
          provide: 'MESSAGE_EVENT',
          useValue: mockEventHandler,
        },
        {
          provide: CredentialService,
          useValue: mockCredentialService,
        },
        {
          provide: ConnectionsRepository,
          useValue: mockConnectionsRepository,
        },
        {
          provide: ConnectionsEventService,
          useValue: mockConnectionsEventService,
        },
      ],
    }).compile()

    service = module.get<MessageEventService>(MessageEventService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should throw an error if url is not provided', () => {
    expect(() => new MessageEventService({})).toThrow(
      new Error('For this module to be used the value url must be added'),
    )
  })

  it('should select version by default', () => {
    service = new MessageEventService({ url: 'http://example.com' })
    expect(Reflect.get(service, 'version')).toBe(ApiVersion.V1)
  })

  describe('received', () => {
    it('should send a receipt message and call eventHandler, but not call credential handlers', async () => {
      const messageReceived = new MessageReceived({
        message: {
          type: 'text',
          connectionId: 'conn1',
          threadId: 'thread1',
          content: 'Hello',
        } as TextMessage,
      })

      await service.received(messageReceived)

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionId: 'conn1',
          receipts: expect.arrayContaining([
            expect.objectContaining({
              state: MessageState.Viewed,
            }),
          ]),
        }),
      )

      expect(mockEventHandler.inputMessage).toHaveBeenCalledWith(messageReceived.message)
      expect(mockCredentialService.handleAcceptance).not.toHaveBeenCalled()
      expect(mockCredentialService.handleRejection).not.toHaveBeenCalled()
    })

    it('should handle CredentialReceptionMessage with Done state', async () => {
      const messageReceived = new MessageReceived({
        message: {
          type: 'credential-reception',
          connectionId: 'conn1',
          threadId: 'thread1',
          state: DidCommCredentialState.Done,
        } as CredentialReceptionMessage,
      })

      await service.received(messageReceived)

      expect(mockCredentialService.handleAcceptance).toHaveBeenCalledWith('thread1')
      expect(mockCredentialService.handleRejection).not.toHaveBeenCalled()
      expect(mockEventHandler.inputMessage).toHaveBeenCalledWith(messageReceived.message)
      expect(mockSend).toHaveBeenCalled()
    })

    it('should handle ProfileMessage and update user profile', async () => {
      const messageReceived = new MessageReceived({
        message: {
          type: 'profile',
          connectionId: 'conn1',
          displayName: 'Test',
          preferredLanguage: 'en',
        } as ProfileMessage,
      })

      await service.received(messageReceived)

      expect(mockConnectionsRepository.updateUserProfile).toHaveBeenCalledWith(
        'conn1',
        expect.objectContaining(messageReceived.message),
      )
      expect(mockConnectionsEventService.handleNewConnection).toHaveBeenCalledWith('conn1')
      expect(mockEventHandler.inputMessage).toHaveBeenCalledWith(messageReceived.message)
      expect(mockSend).toHaveBeenCalled()
    })
  })
})
