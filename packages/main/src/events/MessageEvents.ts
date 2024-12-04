import type { ServerConfig } from '../utils/ServerConfig'
import type { CredentialStateChangedEvent } from '@credo-ts/core'
import type { MessageReceiptsReceivedEvent, MessageState } from 'credo-ts-receipts'

import {
  CallAcceptMessage,
  CallEndMessage,
  CallOfferMessage,
  CallRejectMessage,
} from '@2060.io/credo-ts-didcomm-calls'
import {
  EMrtdDataReceivedEvent,
  MrtdEventTypes,
  MrtdProblemReportEvent,
  MrtdProblemReportReason,
  MrzDataReceivedEvent,
} from '@2060.io/credo-ts-didcomm-mrtd'
import {
  ConnectionProfileUpdatedEvent,
  ProfileEventTypes,
  UserProfileRequestedEvent,
} from '@2060.io/credo-ts-didcomm-user-profile'
import {
  BaseMessage,
  Claim,
  MenuSelectMessage,
  IdentityProofSubmitMessage,
  TextMessage,
  CredentialRequestMessage,
  CredentialReceptionMessage,
  ContextualMenuRequestMessage,
  ContextualMenuSelectMessage,
  MediaMessage,
  CallOfferRequestMessage,
  CallEndRequestMessage,
  CallRejectRequestMessage,
  ProfileMessage,
  MrzDataSubmitMessage,
  EMrtdDataSubmitMessage,
  VerifiableCredentialSubmittedProofItem,
  MessageStateUpdated,
  MessageReceived,
  MrtdSubmitState,
  CallAcceptRequestMessage,
} from '@2060.io/service-agent-model'
import { MenuRequestMessage, PerformMessage } from '@credo-ts/action-menu'
import { V1PresentationMessage, V1PresentationProblemReportMessage } from '@credo-ts/anoncreds'
import { AnonCredsCredentialDefinitionRecordMetadataKeys } from '@credo-ts/anoncreds/build/repository/anonCredsCredentialDefinitionRecordMetadataTypes'
import {
  CredentialEventTypes,
  CredentialState,
  V2PresentationProblemReportMessage,
  AgentEventTypes,
  AgentMessageProcessedEvent,
  BasicMessage,
  V2PresentationMessage,
} from '@credo-ts/core'
import { AnswerMessage, QuestionAnswerService } from '@credo-ts/question-answer'
import {
  MediaSharingEventTypes,
  MediaSharingRole,
  MediaSharingState,
  MediaSharingStateChangedEvent,
} from 'credo-ts-media-sharing'
import { ReceiptsEventTypes } from 'credo-ts-receipts'

import { ServiceAgent } from '../utils/ServiceAgent'
import { createDataUrl } from '../utils/parsers'

import { sendWebhookEvent } from './WebhookEvent'

// FIXME: timestamps are currently taken from reception date. They should be get from the originating DIDComm message
// as soon as the corresponding extension is added to them
export const messageEvents = async (agent: ServiceAgent, config: ServerConfig) => {
  agent.events.on(AgentEventTypes.AgentMessageProcessed, async ({ payload }: AgentMessageProcessedEvent) => {
    config.logger.debug(`AgentMessageProcessedEvent received: ${JSON.stringify(payload.message)}`)
    const { message, connection } = payload

    if (!connection) {
      config.logger.warn(
        `[messageEvents] Received contactless message of type ${message.type}. Not supported yet.`,
      )
      return
    }

    // Basic Message protocol messages
    if (message.type === BasicMessage.type.messageTypeUri) {
      const msg = new TextMessage({
        connectionId: connection.id,
        content: (payload.message as BasicMessage).content,
        id: payload.message.id,
        threadId: payload.message.thread?.parentThreadId,
        timestamp: new Date(), // It can take also 'sentTime' to be related to the origin
      })

      await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
    }

    // Action Menu protocol messages
    if (message.type === MenuRequestMessage.type.messageTypeUri) {
      const msg = new ContextualMenuRequestMessage({
        connectionId: connection.id,
        id: connection.id,
        timestamp: new Date(),
      })

      await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
    }

    if (message.type === PerformMessage.type.messageTypeUri) {
      const msg = new ContextualMenuSelectMessage({
        selectionId: (message as PerformMessage).name,
        connectionId: connection.id,
        id: message.id,
        timestamp: new Date(),
      })

      await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
    }

    // Question Answer protocol messages
    if (message.type === AnswerMessage.type.messageTypeUri) {
      const record = await agent.dependencyManager
        .resolve(QuestionAnswerService)
        .getByThreadAndConnectionId(agent.context, connection.id, message.threadId)

      const textIdMapping = record.metadata.get<Record<string, string>>('text-id-mapping')

      if (!textIdMapping) {
        config.logger.warn(
          `[messageEvents] No text-id mapping found for Menu message. Using responded text as identifier`,
        )
      }
      const selectionId = textIdMapping
        ? textIdMapping[(message as AnswerMessage).response]
        : (message as AnswerMessage).response
      const msg = new MenuSelectMessage({
        threadId: message.threadId,
        connectionId: connection.id,
        menuItems: [{ id: selectionId }],
        id: message.id,
      })

      await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
    }

    if (message.type === CallOfferMessage.type.messageTypeUri) {
      const callOffer = message as CallOfferMessage
      const msg = new CallOfferRequestMessage({
        id: message.id,
        connectionId: connection.id,
        offerExpirationTime: callOffer.offerExpirationTime ?? undefined,
        offerStartTime: callOffer.offerStartTime ?? undefined,
        description: callOffer.description,
        parameters: callOffer.parameters,
        threadId: message.thread?.threadId,
        timestamp: new Date(),
      })

      await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
    }

    if (message.type === CallEndMessage.type.messageTypeUri) {
      const thread = (message as CallEndMessage).thread
      const msg = new CallEndRequestMessage({
        id: message.id,
        connectionId: connection.id,
        threadId: thread?.threadId,
        timestamp: new Date(),
      })

      await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
    }

    if (message.type === CallAcceptMessage.type.messageTypeUri) {
      const parameters = (message as CallAcceptMessage).parameters
      const msg = new CallAcceptRequestMessage({
        id: message.id,
        connectionId: connection.id,
        parameters: parameters,
        threadId: message.thread?.threadId,
        timestamp: new Date(),
      })

      await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
    }

    if (message.type === CallRejectMessage.type.messageTypeUri) {
      const thread = (message as CallEndMessage).thread
      const msg = new CallRejectRequestMessage({
        id: message.id,
        connectionId: connection.id,
        threadId: thread?.threadId,
        timestamp: new Date(),
      })

      await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
    }

    if (
      [
        V2PresentationProblemReportMessage.type.messageTypeUri,
        V1PresentationProblemReportMessage.type.messageTypeUri,
      ].includes(message.type)
    ) {
      config.logger.info('Presentation problem report received')
      try {
        const record = await agent.proofs.getByThreadAndConnectionId(message.threadId, connection.id)
        const msg = new IdentityProofSubmitMessage({
          submittedProofItems: [
            new VerifiableCredentialSubmittedProofItem({
              errorCode:
                (message as V2PresentationProblemReportMessage).description.en ??
                (message as V2PresentationProblemReportMessage).description.code,
              id: record.threadId, // TODO: store id as a tag
              proofExchangeId: record.id,
            }),
          ],
          connectionId: record.connectionId!,
          id: message.id,
          threadId: record.threadId,
          timestamp: record.updatedAt,
        })

        await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
      } catch (error) {
        config.logger.error(`Error processing presentaion problem report: ${error}`)
      }
    }
    // Proofs protocol messages
    if (
      [V1PresentationMessage.type.messageTypeUri, V2PresentationMessage.type.messageTypeUri].includes(
        message.type,
      )
    ) {
      config.logger.info('Presentation received')

      try {
        const record = await agent.proofs.getByThreadAndConnectionId(message.threadId, connection.id)

        const formatData = await agent.proofs.getFormatData(record.id)

        const revealedAttributes =
          formatData.presentation?.anoncreds?.requested_proof.revealed_attrs ??
          formatData.presentation?.indy?.requested_proof.revealed_attrs

        const revealedAttributeGroups =
          formatData.presentation?.anoncreds?.requested_proof?.revealed_attr_groups ??
          formatData.presentation?.indy?.requested_proof.revealed_attr_groups

        const claims: Claim[] = []
        if (revealedAttributes) {
          for (const [name, value] of Object.entries(revealedAttributes)) {
            claims.push(new Claim({ name, value: value.raw }))
          }
        }

        if (revealedAttributeGroups) {
          for (const [, groupAttributes] of Object.entries(revealedAttributeGroups)) {
            for (const attrName in groupAttributes.values) {
              claims.push(new Claim({ name: attrName, value: groupAttributes.values[attrName].raw }))
            }
          }
        }
        const msg = new IdentityProofSubmitMessage({
          submittedProofItems: [
            new VerifiableCredentialSubmittedProofItem({
              id: record.threadId, // TODO: store id as a tag
              proofExchangeId: record.id,
              claims,
              verified: record.isVerified ?? false,
            }),
          ],
          connectionId: record.connectionId!,
          id: message.id,
          threadId: record.threadId,
          timestamp: record.updatedAt,
        })

        await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
      } catch (error) {
        config.logger.error(`Error processing presentaion message: ${error}`)
      }
    }
  })

  // Credential events
  agent.events.on(
    CredentialEventTypes.CredentialStateChanged,
    async ({ payload }: CredentialStateChangedEvent) => {
      config.logger.debug(`CredentialStateChangedEvent received. Record id: 
      ${JSON.stringify(payload.credentialRecord.id)}, state: ${JSON.stringify(payload.credentialRecord.state)}`)
      const record = payload.credentialRecord

      if (record.state === CredentialState.ProposalReceived) {
        const credentialProposalMessage = await agent.credentials.findProposalMessage(record.id)
        const message = new CredentialRequestMessage({
          connectionId: record.connectionId!,
          id: record.id,
          threadId: credentialProposalMessage?.threadId,
          claims:
            credentialProposalMessage?.credentialPreview?.attributes.map(
              p => new Claim({ name: p.name, value: p.value, mimeType: p.mimeType }),
            ) ?? [],
          credentialDefinitionId: record.metadata.get(
            AnonCredsCredentialDefinitionRecordMetadataKeys.CredentialDefinitionMetadata,
          )?.credentialDefinitionId,
          timestamp: record.createdAt,
        })

        await sendMessageReceivedEvent(agent, message, message.timestamp, config)
      } else if (
        [CredentialState.Declined, CredentialState.Done, CredentialState.Abandoned].includes(record.state)
      ) {
        const message = new CredentialReceptionMessage({
          connectionId: record.connectionId!,
          id: record.id,
          threadId: record.threadId,
          state:
            record.errorMessage === 'issuance-abandoned: e.msg.refused'
              ? CredentialState.Declined
              : record.state,
        })
        await sendMessageReceivedEvent(agent, message, message.timestamp, config)
      }
    },
  )

  // Media protocol events
  agent.events.on(MediaSharingEventTypes.StateChanged, async ({ payload }: MediaSharingStateChangedEvent) => {
    const record = payload.mediaSharingRecord

    config.logger
      .debug(`MediaSharingStateChangedEvent received. Role: ${record.role} Connection id: ${record.connectionId}. 
    Items: ${JSON.stringify(record.items)} `)

    if (record.state === MediaSharingState.MediaShared && record.role === MediaSharingRole.Receiver) {
      if (record.items) {
        const message = new MediaMessage({
          connectionId: record.connectionId!,
          id: record.threadId,
          threadId: record.parentThreadId,
          timestamp: record.createdAt,
          items: record.items?.map(item => ({
            id: item.id,
            ciphering: item.ciphering,
            uri: item.uri!,
            mimeType: item.mimeType,
            byteCount: item.byteCount,
            description: item.description,
            filename: item.fileName,
            duration: item.metadata?.duration as number,
            preview: item.metadata?.preview as string,
            width: item.metadata?.width as number,
            height: item.metadata?.height as number,
            title: item.metadata?.title as string,
            icon: item.metadata?.icon as string,
            openingMode: item.metadata?.openingMode as string,
            screenOrientation: item.metadata?.screenOrientation as string,
          })),
        })

        await sendMessageReceivedEvent(agent, message, message.timestamp, config)
      }
    }
  })

  // Receipts protocol events
  agent.events.on(
    ReceiptsEventTypes.MessageReceiptsReceived,
    async ({ payload }: MessageReceiptsReceivedEvent) => {
      const connectionId = payload.connectionId
      config.logger.debug(`MessageReceiptsReceivedEvent received. Connection id: ${connectionId}. 
    Receipts: ${JSON.stringify(payload.receipts)} `)
      const receipts = payload.receipts

      receipts.forEach(receipt => {
        const { messageId, timestamp, state } = receipt
        sendMessageStateUpdatedEvent({ agent, messageId, connectionId, state, timestamp, config })
      })
    },
  )

  // User profile events
  agent.events.on(ProfileEventTypes.UserProfileRequested, async ({ payload }: UserProfileRequestedEvent) => {
    config.logger.debug(`UserProfileRequestedEvent received. Connection id: ${payload.connection.id} 
      Query: ${JSON.stringify(payload.query)}`)

    // TODO: Allow to manually manage this setting
    // Currently we only send the profile if we are using our "main" connection
    const outOfBandRecordId = payload.connection.outOfBandId
    if (outOfBandRecordId) {
      const outOfBandRecord = await agent.oob.findById(outOfBandRecordId)
      const parentConnectionId = outOfBandRecord?.getTag('parentConnectionId') as string | undefined
      if (!parentConnectionId)
        await agent.modules.userProfile.sendUserProfile({ connectionId: payload.connection.id })
    }
  })

  agent.events.on(
    ProfileEventTypes.ConnectionProfileUpdated,
    async ({ payload: { connection, profile } }: ConnectionProfileUpdatedEvent) => {
      const { displayName, displayPicture, displayIcon, description, preferredLanguage } = profile
      config.logger.debug(`ConnectionProfileUpdatedEvent received. Connection id: ${connection.id} 
        Profile: ${JSON.stringify(profile)}`)

      const msg = new ProfileMessage({
        connectionId: connection.id,
        displayName,
        displayImageUrl: displayPicture && createDataUrl(displayPicture),
        displayIconUrl: displayIcon && createDataUrl(displayIcon),
        description,
        preferredLanguage,
      })

      await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
    },
  )

  // MRTD events
  agent.events.on(MrtdEventTypes.MrzDataReceived, async ({ payload }: MrzDataReceivedEvent) => {
    const { connection, mrzData, threadId } = payload

    const msg = new MrzDataSubmitMessage({
      connectionId: connection.id,
      threadId,
      state: MrtdSubmitState.Submitted,
      mrzData,
    })

    await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
  })

  agent.events.on(MrtdEventTypes.EMrtdDataReceived, async ({ payload }: EMrtdDataReceivedEvent) => {
    const { connection, dataGroups, threadId } = payload

    const msg = new EMrtdDataSubmitMessage({
      connectionId: connection.id,
      threadId,
      state: MrtdSubmitState.Submitted,
      dataGroups,
    })

    await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
  })

  // MRTD problem reports
  agent.events.on(MrtdEventTypes.MrtdProblemReport, async ({ payload }: MrtdProblemReportEvent) => {
    const { connection, description, threadId } = payload

    const stateMap: Record<MrtdProblemReportReason, MrtdSubmitState> = {
      'e.p.emrtd-refused': MrtdSubmitState.Declined,
      'e.p.emrtd-timeout': MrtdSubmitState.Timeout,
      'e.p.mrz-refused': MrtdSubmitState.Declined,
      'e.p.mrz-timeout': MrtdSubmitState.Timeout,
    }

    if (
      [MrtdProblemReportReason.EmrtdRefused, MrtdProblemReportReason.EmrtdTimeout].includes(
        description.code as MrtdProblemReportReason,
      )
    ) {
      const msg = new EMrtdDataSubmitMessage({
        connectionId: connection.id,
        threadId,
        state: stateMap[description.code as MrtdProblemReportReason],
      })
      await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
    } else if (
      [MrtdProblemReportReason.MrzRefused, MrtdProblemReportReason.MrzTimeout].includes(
        description.code as MrtdProblemReportReason,
      )
    ) {
      const msg = new MrzDataSubmitMessage({
        connectionId: connection.id,
        threadId,
        state: stateMap[description.code as MrtdProblemReportReason],
      })
      await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
    }
  })

  // At the moment we only support refusal/timeouts. Other errors are TBD
}

const sendMessageReceivedEvent = async (
  agent: ServiceAgent,
  message: BaseMessage,
  timestamp: Date,
  config: ServerConfig,
) => {
  const recordId = await agent.genericRecords.findById(message.id)
  if (recordId?.getTag('messageId') as string) message.id = recordId?.getTag('messageId') as string
  const body = new MessageReceived({
    timestamp,
    message: message,
  })

  await sendWebhookEvent(config.webhookUrl + '/message-received', body, config.logger)
}

const sendMessageStateUpdatedEvent = async (options: {
  agent: ServiceAgent
  messageId: string
  connectionId: string
  state: MessageState
  timestamp: Date
  config: ServerConfig
}) => {
  const { agent, messageId, connectionId, state, timestamp, config } = options
  const recordId = await agent.genericRecords.findById(messageId)

  const body = new MessageStateUpdated({
    messageId: (recordId?.getTag('messageId') as string) ?? messageId,
    state,
    timestamp,
    connectionId,
  })
  await sendWebhookEvent(config.webhookUrl + '/message-state-updated', body, config.logger)
}
