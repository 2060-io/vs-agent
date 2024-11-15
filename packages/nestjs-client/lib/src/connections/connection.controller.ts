import { ConnectionStateUpdated, EventType } from '@2060.io/model'
import { Body, Controller, Logger, Post } from '@nestjs/common'

import { ConnectionsEventService } from './connection.service'
import { HttpUtils } from '@2060.io/service-agent-client'

@Controller('')
export class ConnectionsEventController {
  private readonly logger = new Logger(ConnectionsEventController.name)

  constructor(private readonly service: ConnectionsEventService) {}

  @Post(`/${EventType.MessageStateUpdated}`)
  async connectionState(@Body() body: ConnectionStateUpdated): Promise<{ message: string }> {
    try {
      this.logger.log(`connectionStateUpdated event: ${JSON.stringify(body)}`)

      await this.service.createConnection(body)

      return { message: 'Connection state updated successfully' }      
    } catch (error) {
      HttpUtils.handleException(this.logger, error, 'Failed to update connection state');  
    }
  }
}
