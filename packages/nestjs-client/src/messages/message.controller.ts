import { HttpUtils } from '@2060.io/vs-agent-client'
import { EventType, MessageReceived, MessageStateUpdated } from '@2060.io/vs-agent-model'
import { Body, Controller, HttpStatus, Logger, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { MessageEventService } from './message.service'

@ApiTags('Message Event')
@Controller()
export class MessageEventController {
  private readonly logger = new Logger(MessageEventController.name)

  constructor(private readonly message: MessageEventService) {}

  @Post(`/${EventType.MessageReceived}`)
  @ApiOperation({
    summary: 'Handle the MessageReceived event',
    description: 'Processes the MessageReceived event and updates the message state.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message received updated successfully.',
    schema: {
      example: { message: 'Message received updated successfully' },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error.' })
  async received(@Body() body: MessageReceived): Promise<{ message: string }> {
    try {
      this.logger.log(`messageReceived event: ${JSON.stringify(body)}`)

      await this.message.received(body)
      return { message: 'Message received updated successfully' }
    } catch (error) {
      HttpUtils.handleException(this.logger, error, 'Failed to received message state')
    }
  }

  @Post(`/${EventType.MessageStateUpdated}`)
  @ApiOperation({
    summary: 'Handle the MessageStateUpdated event',
    description: 'Processes the MessageStateUpdated event and updates the message state.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message state updated successfully.',
    schema: {
      example: { message: 'Message state updated successfully' },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error.' })
  async updated(@Body() body: MessageStateUpdated): Promise<{ message: string }> {
    try {
      this.logger.log(`messageStateUpdated event: ${JSON.stringify(body)}`)

      await this.message.updated()
      return { message: 'Message state updated successfully' }
    } catch (error) {
      HttpUtils.handleException(this.logger, error, 'Failed to update message state')
    }
  }
}
