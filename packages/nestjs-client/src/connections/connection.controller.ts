import { HttpUtils } from '@2060.io/vs-agent-client'
import { ConnectionStateUpdated, EventType } from '@2060.io/vs-agent-model'
import { Body, Controller, HttpStatus, Logger, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { ConnectionsEventService } from './connection.service'

@ApiTags('Connections Event')
@Controller()
export class ConnectionsEventController {
  private readonly logger = new Logger(ConnectionsEventController.name)

  constructor(private readonly service: ConnectionsEventService) {}

  @Post(`/${EventType.ConnectionState}`)
  @ApiOperation({
    summary: 'Handle the ConnectionState event',
    description: 'Processes the ConnectionState event and updates the connection state.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Connection state updated successfully.',
    schema: {
      example: { message: 'Connection state updated successfully' },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error.' })
  async update(@Body() body: ConnectionStateUpdated): Promise<{ message: string }> {
    try {
      this.logger.log(`connectionStateUpdated event: ${JSON.stringify(body)}`)

      await this.service.update(body)

      return { message: 'Connection state updated successfully' }
    } catch (error) {
      HttpUtils.handleException(this.logger, error, 'Failed to update connection state')
    }
  }
}
