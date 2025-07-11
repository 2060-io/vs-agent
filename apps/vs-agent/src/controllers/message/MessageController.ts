import { BaseMessage, MessageType } from '@2060.io/vs-agent-model'
import { DidExchangeState, utils } from '@credo-ts/core'
import { Body, Controller, HttpException, HttpStatus, Logger, Post } from '@nestjs/common'
import {
  ApiBody,
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  getSchemaPath,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger'

import { VsAgentService } from '../../services/VsAgentService'
import { VsAgent } from '../../utils/VsAgent'
import { MessageServiceFactory } from './services/MessageServiceFactory'
import { BaseMessageDto } from './dto/base-message.dto'
import { createDocLoader } from '../../utils/swagger-docs'

const docs = createDocLoader('doc/vs-agent-api.md')

@ApiTags('message')
@Controller({ path: 'message', version: '1' })
export class MessageController {
  private readonly logger = new Logger(MessageController.name)

  constructor(
    private readonly messageServiceFactory: MessageServiceFactory,
    private readonly agentService: VsAgentService,
  ) {}

  @Post('/')
  @ApiBody({
    type: BaseMessageDto,
    description: [
      docs.getSection('## Messaging', { includeFences: true }),
      docs.getSection('### Messaging to/from other agents', { includeFences: true }),
    ].join('\n\n'),
    schema: { allOf: [{ $ref: getSchemaPath(BaseMessageDto) }] },
    examples: docs.getExamples(Object.values(MessageType)),
  })
  @ApiOkResponse({
    description: 'Message sent successfully',
    schema: { example: { id: '550e8400-e29b-41d4-a716-446655440000' } },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    schema: {
      example: {
        statusCode: 500,
        error: 'something went wrong: Error message here',
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
