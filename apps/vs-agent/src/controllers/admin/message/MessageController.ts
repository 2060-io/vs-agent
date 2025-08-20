import { BaseMessage } from '@2060.io/vs-agent-model'
import { DidExchangeState, utils } from '@credo-ts/core'
import { Body, Controller, HttpException, HttpStatus, Logger, Post } from '@nestjs/common'
import { ApiBody, ApiTags } from '@nestjs/swagger'

import { VsAgentService } from '../../../services/VsAgentService'
import { VsAgent } from '../../../utils/VsAgent'

import { MessageServiceFactory } from './services/MessageServiceFactory'

@ApiTags('message')
@Controller({
  path: 'message',
  version: '1',
})
export class MessageController {
  private readonly logger = new Logger(MessageController.name)

  constructor(
    private readonly messageServiceFactory: MessageServiceFactory,
    private readonly agentService: VsAgentService,
  ) {}

  @Post('/')
  @ApiBody({
    type: BaseMessage,
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
  public async sendMessage(@Body() message: BaseMessage): Promise<{ id: string }> {
    try {
      const agent = await this.agentService.getAgent()
      await this.checkForDuplicateId(agent, message)
      const connection = await agent.connections.findById(message.connectionId)

      if (!connection) throw new Error(`Connection with id ${message.connectionId} not found`)

      if (connection.state === DidExchangeState.Completed && (!connection.did || !connection.theirDid)) {
        throw new Error(`This connection has been terminated. No further messages are possible`)
      }
      const messageId = message.id ?? utils.uuid()
      message.id = messageId

      await this.messageServiceFactory.processMessage(message, connection)
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

  private async checkForDuplicateId(agent: VsAgent, message: BaseMessage): Promise<void> {
    const records = message.id
      ? await agent.genericRecords.findAllByQuery({
          messageId: message.id,
          connectionId: message.connectionId,
        })
      : null

    if (records && records.length > 0) throw new Error(`Duplicated ID: ${message.id}`)
  }
}
