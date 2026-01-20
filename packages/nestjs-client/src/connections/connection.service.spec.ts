import { Test, TestingModule } from '@nestjs/testing'
import { ConnectionStateUpdated, ExtendedDidExchangeState } from '@verana-labs/vs-agent-model'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { ConnectionsRepository, EventHandler, ConnectionsEventService } from '../../src'

describe('ConnectionsEventService', () => {
  let service: ConnectionsEventService
  let mockEventHandler: Partial<EventHandler>
  let mockRepository: Partial<ConnectionsRepository>

  beforeEach(async () => {
    vi.clearAllMocks()

    mockEventHandler = {
      closeConnection: vi.fn(),
      newConnection: vi.fn(),
    }

    mockRepository = {
      updateMetadata: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      isCompleted: vi.fn().mockResolvedValue(false),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionsEventService,
        {
          provide: 'GLOBAL_MODULE_OPTIONS',
          useValue: { useMessages: false },
        },
        {
          provide: 'CONNECTIONS_EVENT',
          useValue: mockEventHandler,
        },
        {
          provide: ConnectionsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<ConnectionsEventService>(ConnectionsEventService)
  })

  it('should be defined', () => {
    expect(service['messageEvent']).toBe(false)
  })

  describe('update', () => {
    it('should update state to Terminated and call closeConnection', async () => {
      const event = new ConnectionStateUpdated({
        state: ExtendedDidExchangeState.Terminated,
        connectionId: '123',
      })

      await service.update(event)

      expect(mockRepository.updateStatus).toHaveBeenCalledWith('123', ExtendedDidExchangeState.Terminated)
      expect(mockEventHandler.closeConnection).toHaveBeenCalledWith('123')
    })

    it('should update state to completed', async () => {
      const event = new ConnectionStateUpdated({
        state: ExtendedDidExchangeState.Completed,
        connectionId: '123',
        metadata: { key: 'value' },
      })

      await service.update(event)

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '123',
          status: ExtendedDidExchangeState.Start,
          metadata: event.metadata,
        }),
      )
    })

    it('should update state to Updated and call handleNewConnection', async () => {
      const event = new ConnectionStateUpdated({
        state: ExtendedDidExchangeState.Updated,
        connectionId: '123',
        metadata: { key: 'value' },
      })

      vi.spyOn(service, 'handleNewConnection').mockImplementation(vi.fn())

      await service.update(event)

      expect(service.handleNewConnection).toHaveBeenCalledWith('123')
    })
  })

  describe('handleNewConnection', () => {
    it('should not call newConnection when isCompleted returns false', async () => {
      mockRepository.isCompleted = vi.fn().mockResolvedValue(false)
      await service.handleNewConnection('123')
      expect(mockRepository.isCompleted).toHaveBeenCalledWith('123', false)
      expect(mockEventHandler.newConnection).not.toHaveBeenCalled()
    })

    it('should call newConnection when isCompleted returns true', async () => {
      mockRepository.isCompleted = vi.fn().mockResolvedValue(true)
      await service.handleNewConnection('123')
      expect(mockRepository.isCompleted).toHaveBeenCalledWith('123', false)
      expect(mockEventHandler.newConnection).toHaveBeenCalledWith('123')
    })
  })
})
