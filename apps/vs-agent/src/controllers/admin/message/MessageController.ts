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

@ApiTags('message')
@Controller({ path: 'message', version: '1' })
export class MessageController {
  private readonly logger = new Logger(MessageController.name)

  constructor(
    private readonly messageServiceFactory: MessageServiceFactory,
    private readonly agentService: VsAgentService,
  ) {}

  @Post('/')
  @ApiOperation({
    summary: 'Send a message to another agent',
    description: `
  **Messaging**
  
  Messages are submitted in a JSON format, whose base is as follows:
  
      {
        "connectionId": UUID,
        "id": UUID,
        "timestamp": NumericDate,
        "threadId": UUID,
        "type": MessageType
      }
  
  **Messaging to/from other agents**
  
  To message other agents, a single endpoint is used (\`/message\`), which receives by POST a JSON body containing the message.
  
  Response from VS-A will generally result in a 200 HTTP response code and include a JSON object with the details of the submission:
  
      {
        "message": string (optional, in case of error),
        "id": UUID (submitted message id)
      }
  
  Using the message \`id\`, the agent controller can subscribe and verify the message sending status.
  
  To receive messages from other agents, the controller can subscribe to the \`message-received\` topic.
    `,
  })
  @ApiBody({
    type: BaseMessageDto,
    description: 'A message sent over an established connection',
    schema: {
      allOf: [{ $ref: getSchemaPath(BaseMessageDto) }],
    },
    examples: {
      credentialRequest: {
        summary: 'Credential Request',
        description: `This message starts a Credential Issuance flow. The requested credential type is defined by its \`credentialDefinitionId\`, which must be known beforehand by the requester. Optionally, requester can define some claims about themselves (if not defined, the issuer will get them from other messages (e.g. by requesting proofs or asking through text messages)).
    
    Parameters:
    
    - Credential Definition ID  
    - (optional) Claims (name, phoneNumber, subscriptionId, etc) if needed`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.CredentialRequestMessage,
          credentialDefinitionId: 'vc-issuer-1:TAG:1',
          claims: [{ name: 'phoneNumber', mimeType: 'text/plain', value: '+5731294956' }],
        },
      },
      credentialIssuance: {
        summary: 'Credential Issuance',
        description: `By sending this message, a Verifiable Credential is effectively issued and sent to the destination connection.
    
    This message could be sent as a response to a Credential Request. In such case, \`threadId\` is used to identify credential details. But it can also start a new Credential Issuance flow, and specify
    
    Parameters:
    
    - (optional) Credential Definition ID  
    - (optional) Revocation Definition ID  
    - (optional) Revocation Index  
    - (optional) Claims  
    
    **Note:** When using revocation parameters (\`revocationRegistryDefinitionId\` and \`revocationRegistryIndex\`), it is crucial to preserve both values as they were originally generated with the credential. Each revocation registry has a finite capacity for credentials (default is 1000), and the \`revocationRegistryIndex\` uniquely identifies the specific credential within the registry. Failing to maintain these parameters correctly may lead to issues during the credential revocation process.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.CredentialIssuanceMessage,
          credentialDefinitionId: 'vc-issuer-1:TAG:1',
          revocationRegistryDefinitionId: 'rev-reg-1',
          revocationRegistryIndex: 1,
          claims: [{ name: 'claim-name', mimeType: 'mime-type', value: 'claim-value' }],
        },
      },
      credentialRevocation: {
        summary: 'Credential Revocation',
        description: `By sending this message, a Verifiable Credential is effectively revoked and a notification is sent to the DIDComm connection it has been issued to.
    
    In this context, \`threadId\` is used to identify the details of the credential`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.CredentialRevocationMessage,
        },
      },
      credentialReception: {
        summary: 'Credential Reception',
        description: `By sending this message, a recipient acknowledges the reception of a Verifiable Credential (or informs they declined it).
    
    This message is sent as a response to a Credential Issue. \`threadId\` is used to identify credential details.
    
    The state can be one of 'done', 'declined' or 'abandoned', depending on how the flow went.
    
    Parameters:
    
    - State: final state of the flow. 'done' in case that the recipient accepted and stored the credential, and 'declined' if they refused to receive it. 'abandoned' may be thrown in case of an error`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.CredentialReceptionMessage,
          state: 'done',
        },
      },
      identityProofRequest: {
        summary: 'Identity Proof Request',
        description: `Starts an Identity Verification flow, requesting a certain number of identity proofing items. It is usually sent by an issuer to a potential holder before the credential is actually issued.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.IdentityProofRequestMessage,
          requestedProofItems: [{ id: 'item-1', type: 'verifiable-credential' }],
        },
      },
      identityProofSubmit: {
        summary: 'Identity Proof Submit',
        description: `This message is used to inform about the submission of a certain proof identity proof item.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.IdentityProofSubmitMessage,
          submittedProofItems: [{ id: 'item-1', type: 'verifiable-credential' }],
        },
      },
      identityProofResult: {
        summary: 'Identity Proof Result',
        description: `This message is used to inform about the result of the processing of a certain identity proof item.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.IdentityProofResultMessage,
          proofItemResults: [{ id: 'item-1', type: 'verifiable-credential', code: 'ok' }],
        },
      },
      text: {
        summary: 'Text',
        description: `Sends a simple text to a destination`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.TextMessage,
          content: 'Hello!',
        },
      },
      media: {
        summary: 'Media',
        description: `Shares media files to a destination. They might be previously encrypted and stored in an URL reachable by the destination agent.
    
    \`mimeType\` is mandatory and specifies the kind of media that is being shared. Some supported types are:
    
    - \`image/png\` and \`image/jpg\` for images
    - \`video/*\` for videos
    - \`audio/*\` for voice notes
    - \`text/html\` for links to websites
    
    \`filename\`, \`description\` and \`byteCount\` are optional but recommended to make it easier for the receiving end to know information about the file about to be downloaded.
    
    \`ciphering\` is optional but recommended. Other parameters are optional and depend on the nature of the media that is being shared. Namely:
    
    - \`preview\`: is a string used mainly for video and images that includes a base64-encoded thumbnail
    - \`width\` and \`height\` are used also for videos and images to let the other party know the actual dimensions of the media before downloading it (e.g. to pre-calculate the placeholder in their screen). They are measured in pixels
    - \`duration\` is used in videos and audio files to specify the number of seconds they last`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.MediaMessage,
          description: 'Photo',
          items: [
            {
              mimeType: 'image/png',
              filename: 'pic.png',
              byteCount: 1024,
              uri: 'https://...',
            },
          ],
        },
      },
      receipts: {
        summary: 'Receipts',
        description: `Sends message updates for a number of messages.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.ReceiptsMessage,
          receipts: [{ messageId: 'm1', state: 'sent', timestamp: '2025-07-08T12:00:00Z' }],
        },
      },
      contextualMenuRequest: {
        summary: 'Contextual Menu Request',
        description: `Requests a destination agent context menu root (if any). The other side should always respond with a Contextual Menu Update even if no context menu is available (in such case, an empty payload will be sent).`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.ContextualMenuRequestMessage,
        },
      },
      contextualMenuUpdate: {
        summary: 'Contextual Menu Update',
        description: `Sends or updates the contents for the contextual menu to destination agent.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.ContextualMenuUpdateMessage,
          payload: {
            title: 'Actions',
            description: 'Choose an action',
            options: [{ id: 'opt-1', title: 'Do X', description: 'Executes X' }],
          },
        },
      },
      contextualMenuSelection: {
        summary: 'Contextual Menu Selection',
        description: `Submits the selected item of context menu.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.ContextualMenuSelectMessage,
          selectionId: 'opt-1',
        },
      },
      displayMenu: {
        summary: 'Display Menu',
        description: `Sends a menu to display different actions in destination agent`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.MenuDisplayMessage,
          prompt: 'Choose',
          menuItems: [{ id: 'm1', text: 'One' }],
        },
      },
      menuSelection: {
        summary: 'Menu Selection',
        description: `Submits the selected item of a presented menu, defined in \`threadId\` field.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.MenuSelectMessage,
          menuItems: [{ id: 'm1' }],
          content: 'You chose One',
        },
      },
      invitation: {
        summary: 'Invitation',
        description: `Creates an Out of Band invitation message and sends it through an already established DIDComm channel. This is used mostly to generate sub-connections, but can also be used to forward an invitation to a public resolvable DID (passed optionally as a parameter).`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.InvitationMessage,
          label: 'Svc',
          imageUrl: 'https://avatar.png',
          did: 'did:web:svc',
        },
      },
      profile: {
        summary: 'Profile',
        description: `Sends User Profile to a particular connection. An Agent may have its default profile settings, but also override them and send any arbitrary value to each connection. All items are optional.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.ProfileMessage,
          displayName: 'Bob',
          displayImageUrl: 'https://bob.png',
          displayIconUrl: 'https://bob.png',
        },
      },
      terminateConnection: {
        summary: 'Terminate Connection',
        description: `Terminates a particular connection, notifying the other party through a 'Hangup' message. No further messages will be allowed after this action.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.TerminateConnectionMessage,
        },
      },
      callOffer: {
        summary: 'Call Offer',
        description: `Create a call offer from a service to initiate a WebRTC call and notify the other party of the created request. This message will return a \`threadId\`, which can be used to track the subsequent status of the call. Additional parameters related to the \`wsUrl\` of the WebRTC server connection are expected to notify the other party.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.CallOfferRequestMessage,
          parameters: { key: 'value' },
        },
      },
      callAccept: {
        summary: 'Call Accept',
        description: `Accept a call offer from a third party to initiate a WebRTC call. This message will return a \`threadId\`, which can be used to track the subsequent status of the call. Additional parameters related to the \`wsUrl\` of the WebRTC server connection are expected to notify the other party.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.CallAcceptRequestMessage,
          parameters: { key: 'value' },
        },
      },
      callReject: {
        summary: 'Call Reject',
        description: `Reject a call offer from a third party to initiate a WebRTC call. This message will return a \`threadId\`, which can be used to identify which offer has been terminated.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.CallRejectRequestMessage,
        },
      },
      callEnd: {
        summary: 'Call End',
        description: `End a call offer from a third party to initiate a WebRTC call. This message will return a \`threadId\`, which can be used to identify which offer has been terminated.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.CallEndRequestMessage,
        },
      },
      mrzDataRequest: {
        summary: 'MRZ Data Request',
        description: `Request the other party to provide the Machine Readable Zone string from a valid ID document.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.MrzDataRequestMessage,
        },
      },
      mrzDataSubmit: {
        summary: 'MRZ Data Submit',
        description: `Submit Machine Readable Zone data. This message may be sent either individually or as a response to a MRZ Data Request.
    
    The state can be one of 'submitted', 'declined', 'timeout' or 'error', depending on how the flow went. The latter is used for unspecified errors (e.g. User Agent not capable of handling the request).`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.MrzDataSubmitMessage,
          state: 'submitted',
          mrzData: {
            raw: [
              'I<UTOD23145890<1233<<<<<<<<<<<',
              '7408122F1204159UTO<<<<<<<<<<<6',
              'ERIKSSON<<ANNA<MARIA<<<<<<<<<<',
            ],
            parsed: { valid: false, fields: {} },
          },
        },
      },
      emrtdDataRequest: {
        summary: 'eMRTD Data Request',
        description: `Request the other party to read and provide eMRTD (Electronic Machine Readable Travel Document) data from a compatible electronic document.`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.EMrtdDataRequestMessage,
        },
      },
      emrtdDataSubmit: {
        summary: 'eMRTD Data Submit',
        description: `Submit data retrieved from an electronic Machine Readable Travel Document. This message may be sent either individually or as a response to an eMRTD Data Request.
    
    The state can be one of 'submitted', 'declined', 'timeout' or 'error', depending on how the flow went. The latter is used for unspecified errors (e.g. User Agent not capable of handling the request).`,
        value: {
          connectionId: 'conn-1',
          type: MessageType.EMrtdDataSubmitMessage,
          state: 'submitted',
          dataGroups: { raw: {}, parsed: { valid: true } },
        },
      },
    },
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
