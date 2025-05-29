import { HttpUtils } from '@2060.io/vs-agent-client'
import { MessageReceived, MessageStateUpdated, TextMessage } from '@2060.io/vs-agent-model'
import { Logger } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { MessageState } from 'credo-ts-receipts'

import { MessageEventController } from './message.controller'
import { MessageEventService } from './message.service'

jest.mock('@2060.io/vs-agent-client', () => ({
  HttpUtils: {
    handleException: jest.fn(),
  },
}))

describe('MessageEventController', () => {
  let controller: MessageEventController
  let messageService: MessageEventService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageEventController],
      providers: [
        {
          provide: MessageEventService,
          useValue: {
            received: jest.fn(),
            updated: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<MessageEventController>(MessageEventController)
    messageService = module.get<MessageEventService>(MessageEventService)
  })

  describe('received', () => {
    const mockBody = new MessageReceived({
      message: {
        type: 'text',
        connectionId: 'conn1',
        threadId: 'thread1',
        content: 'Hello',
      } as TextMessage,
    })
    it('should successfully process received message', async () => {
      const result = await controller.received(mockBody)

      expect(messageService.received).toHaveBeenCalledWith(mockBody)
      expect(result).toEqual({ message: 'Message received updated successfully' })
    })

    it('should handle error in received message processing', async () => {
      const error = new Error('Test error')
      jest.spyOn(messageService, 'received').mockRejectedValue(error)
      await controller.received(mockBody)

      expect(HttpUtils.handleException).toHaveBeenCalledWith(
        expect.any(Logger),
        error,
        'Failed to received message state',
      )
    })
  })

  describe('updated', () => {
    it('should successfully process updated message state', async () => {
      const mockBody = new MessageStateUpdated({
        connectionId: 'conn-1',
        messageId: 'msg-1',
        state: MessageState.Submitted,
      })

      const result = await controller.updated(mockBody)

      expect(messageService.updated).toHaveBeenCalled()
      expect(result).toEqual({ message: 'Message state updated successfully' })
    })

    it('should handle error in message state update', async () => {
      const error = new Error('Test error')
      jest.spyOn(messageService, 'updated').mockRejectedValue(error)
      jest.spyOn(HttpUtils, 'handleException')

      const mockBody = new MessageStateUpdated({
        connectionId: 'conn-1',
        messageId: 'msg-1',
        state: MessageState.Submitted,
      })
      await controller.updated(mockBody)

      expect(HttpUtils.handleException).toHaveBeenCalledWith(
        expect.any(Logger),
        error,
        'Failed to update message state',
      )
    })
  })
})
