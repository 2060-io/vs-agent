import { ActionMenuRole, ActionMenuOption } from '@credo-ts/action-menu'
import { AnonCredsRequestedAttribute } from '@credo-ts/anoncreds'
import {
  JsonTransformer,
  AutoAcceptCredential,
  AutoAcceptProof,
  utils,
  MessageSender,
  OutboundMessageContext,
  OutOfBandRepository,
  OutOfBandInvitation,
  DidExchangeState,
} from '@credo-ts/core'
import { QuestionAnswerRepository, ValidResponse } from '@credo-ts/question-answer'
import { Body, Controller, HttpException, HttpStatus, Logger, Post } from '@nestjs/common'
import { ApiBody, ApiTags } from '@nestjs/swagger'

import {
  TextMessage,
  ReceiptsMessage,
  IdentityProofRequestMessage,
  MenuDisplayMessage,
  CredentialIssuanceMessage,
  ContextualMenuUpdateMessage,
  InvitationMessage,
  ProfileMessage,
  MediaMessage,
  IBaseMessage,
  didcommReceiptFromServiceAgentReceipt,
  IdentityProofResultMessage,
  TerminateConnectionMessage,
} from '../../model'
import { VerifiableCredentialRequestedProofItem } from '../../model/messages/proofs/vc/VerifiableCredentialRequestedProofItem'
import { AgentService } from '../../services/AgentService'
import { parsePictureData } from '../../utils/parsers'
import { RequestedCredential } from '../types'

import { MessageDto } from './MessageDto'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'

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
      const job = await this.messageQueue.add('', message)
      return { id: utils.uuid() };
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
