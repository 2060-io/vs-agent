import { ConnectionRecord, DidExchangeState, utils } from '@credo-ts/core'
import { Body, Controller, HttpException, HttpStatus, Logger, Post, Query } from '@nestjs/common'
import { ApiBody, ApiTags } from '@nestjs/swagger'

import { IBaseMessage } from '../../model'

import { MessageDto } from './MessageDto'
import { AgentService } from '../../services/AgentService'
import { MessageServiceFactory } from './services/MessageServiceFactory'
import { GenericRecord } from '@credo-ts/core/build/modules/generic-records/repository/GenericRecord'

@ApiTags('message')
@Controller({
  path: 'message',
  version: '1',
})
export class MessageController {
  private readonly logger = new Logger(MessageController.name)

  constructor( 
    private readonly messageServiceFactory: MessageServiceFactory,
    private readonly agentService: AgentService
   ) {}

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
      let connection: ConnectionRecord | null = null;
      connection = await this.checkForDuplicateId(message);

      if (!connection) throw new Error(`Connection with id ${message.connectionId} not found`)

      if (connection.state === DidExchangeState.Completed && (!connection.did || !connection.theirDid)) {
        throw new Error(`This connection has been terminated. No further messages are possible`)
      }
      const messageId = message.id ?? utils.uuid()
      message.id = messageId

      await this.messageServiceFactory.setProcessMessage( this.isRedisEnabled(), message, connection )
      return { id: messageId }
    } catch (error) {
      this.logger.error(`Error: ${error.stack}`)
      throw new HttpException(
        {
          statusCode: error.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR,
          error: `something went wrong: ${error}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      )
    }
  }

  private isRedisEnabled(): boolean {
    return process.env.REDIS_HOST !== undefined;
  }

  private async checkForDuplicateId(message: IBaseMessage): Promise<ConnectionRecord | null> {
    const agent = await this.agentService.getAgent()
    const records = message.id ? await agent.genericRecords.findAllByQuery({ 'messageId': message.id, 'connectionId': message.connectionId }):null

    if (records && records.length > 0) 
      throw new Error(`Duplicated ID: ${JSON.stringify(records)}`);
    return await agent.connections.findById(message.connectionId)
  }  
}
