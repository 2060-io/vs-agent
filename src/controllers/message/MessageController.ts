import { utils } from '@credo-ts/core'
import { InjectQueue } from '@nestjs/bull'
import { Body, Controller, HttpException, HttpStatus, Logger, Post } from '@nestjs/common'
import { ApiBody, ApiTags } from '@nestjs/swagger'
import { Queue } from 'bull'

import { IBaseMessage } from '../../model'

import { MessageDto } from './MessageDto'

@ApiTags('message')
@Controller({
  path: 'message',
  version: '1',
})
export class MessageController {
  private readonly logger = new Logger(MessageController.name)

  constructor(@InjectQueue('message') private messageQueue: Queue) {}

  @Post('/')
  @ApiBody({
    type: MessageDto,
    examples: {
      text: {
        summary: 'Text message',
        value: {
          connectionId: '2ab2e45e-d896-40bb-9d03-1f79e6083c33',
          type: 'text',
          timestamp: '2024-03-11T14:03:50.607Z',
          content: 'Hello',
        },
      },
      invitation: {
        summary: 'Invitation message',
        value: {
          connectionId: '2ab2e45e-d896-40bb-9d03-1f79e6083c33',
          type: 'invitation',
          timestamp: '2024-03-11T14:03:50.607Z',
          label: 'A service',
          imageUrl: 'https://aservice.com/avatar.png',
          did: 'did:web:aservice.com',
        },
      },
    },
  })
  public async sendMessage(@Body() message: IBaseMessage): Promise<{ id: string }> {
    try {
      const messageId = message.id ?? utils.uuid()
      // TODO: Check if message id already exists

      await this.messageQueue.add('', { message })
      return { id: messageId }
    } catch (error) {
      this.logger.error(`Error: ${error.stack}`)
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `something went wrong: ${error}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      )
    }
  }
}
