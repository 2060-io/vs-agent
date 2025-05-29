import { HttpUtils } from '@2060.io/vs-agent-client'
import { ConnectionStateUpdated, ExtendedDidExchangeState } from '@2060.io/vs-agent-model'
import { Logger } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { ConnectionsEventController } from './connection.controller'
import { ConnectionsEventService } from './connection.service'

jest.mock('@2060.io/vs-agent-client', () => ({
  HttpUtils: {
    handleException: jest.fn(),
  },
}))

describe('ConnectionsEventController', () => {
  let controller: ConnectionsEventController
  let service: ConnectionsEventService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConnectionsEventController],
      providers: [
        {
          provide: ConnectionsEventService,
          useValue: {
            update: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<ConnectionsEventController>(ConnectionsEventController)
    service = module.get<ConnectionsEventService>(ConnectionsEventService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('update', () => {
    const mockBody = new ConnectionStateUpdated({
      connectionId: '123',
      invitationId: '456',
      state: ExtendedDidExchangeState.Completed,
    })

    it('should call service.update and return success message', async () => {
      jest.spyOn(service, 'update').mockResolvedValue(undefined)

      const response = await controller.update(mockBody)

      expect(service.update).toHaveBeenCalledWith(mockBody)
      expect(response).toEqual({ message: 'Connection state updated successfully' })
    })

    it('should handle exceptions and call HttpUtils.handleException', async () => {
      const error = new Error('Test error')
      jest.spyOn(service, 'update').mockRejectedValue(error)

      await controller.update(mockBody)

      expect(HttpUtils.handleException).toHaveBeenCalledWith(
        expect.any(Logger),
        error,
        'Failed to update connection state',
      )
    })
  })
})
