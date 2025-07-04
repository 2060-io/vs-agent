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
  IdentityProofResultMessage,
  TerminateConnectionMessage,
  CallOfferRequestMessage,
  CallEndRequestMessage,
  MrzDataRequestMessage,
  EMrtdDataRequestMessage,
  VerifiableCredentialRequestedProofItem,
  RequestedCredential,
  CredentialRevocationMessage,
} from '@2060.io/vs-agent-model'
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
  ConnectionRecord,
} from '@credo-ts/core'
import { QuestionAnswerRepository, ValidResponse } from '@credo-ts/question-answer'
import { Injectable, Logger } from '@nestjs/common'

import { VsAgentService } from '../../services/VsAgentService'
import { didcommReceiptFromVsAgentReceipt, parsePictureData } from '../../utils/parsers'

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name)

  constructor(private readonly agentService: VsAgentService) {}

  public async sendMessage(message: IBaseMessage, connection: ConnectionRecord): Promise<{ id: string }> {
    try {
      const agent = await this.agentService.getAgent()

      let messageId: string | undefined
      const messageType = message.type
      this.logger.debug!(`Message submitted. ${JSON.stringify(message)}`)

      if (messageType === TextMessage.type) {
        const textMsg = JsonTransformer.fromJSON(message, TextMessage)
        const record = await agent.basicMessages.sendMessage(textMsg.connectionId, textMsg.content)
        messageId = record.threadId
      } else if (messageType === MediaMessage.type) {
        const mediaMsg = JsonTransformer.fromJSON(message, MediaMessage)
        const mediaRecord = await agent.modules.media.create({ connectionId: mediaMsg.connectionId })
        const record = await agent.modules.media.share({
          recordId: mediaRecord.id,
          description: mediaMsg.description,
          items: mediaMsg.items.map(item => ({
            id: item.id,
            uri: item.uri,
            description: item.description,
            mimeType: item.mimeType,
            byteCount: item.byteCount,
            ciphering: item.ciphering?.algorithm
              ? { ...item.ciphering, parameters: item.ciphering.parameters ?? {} }
              : undefined,
            fileName: item.filename,
            metadata: {
              preview: item.preview,
              width: item.width,
              height: item.height,
              duration: item.duration,
              title: item.title,
              icon: item.icon,
              openingMode: item.openingMode,
              screenOrientation: item.screenOrientation,
            },
          })),
        })
        messageId = record.threadId
      } else if (messageType === ReceiptsMessage.type) {
        const textMsg = JsonTransformer.fromJSON(message, ReceiptsMessage)
        await agent.modules.receipts.send({
          connectionId: textMsg.connectionId,
          receipts: textMsg.receipts.map(didcommReceiptFromVsAgentReceipt),
        })
      } else if (messageType === MenuDisplayMessage.type) {
        const msg = JsonTransformer.fromJSON(message, MenuDisplayMessage)

        const record = await agent.modules.questionAnswer.sendQuestion(msg.connectionId, {
          question: msg.prompt,
          validResponses: msg.menuItems.map(item => new ValidResponse({ text: item.text })),
        })
        messageId = record.threadId

        // Add id-text mapping so we can recover it when receiving an answer
        record.metadata.add(
          'text-id-mapping',
          msg.menuItems.reduce(
            (acc, curr) => ((acc[curr.text] = curr.id), acc),
            {} as Record<string, string>,
          ),
        )
        await agent.dependencyManager.resolve(QuestionAnswerRepository).update(agent.context, record)
      } else if (messageType === ContextualMenuUpdateMessage.type) {
        const msg = JsonTransformer.fromJSON(message, ContextualMenuUpdateMessage)

        await agent.modules.actionMenu.clearActiveMenu({
          connectionId: msg.connectionId,
          role: ActionMenuRole.Responder,
        })
        await agent.modules.actionMenu.sendMenu({
          connectionId: msg.connectionId,
          menu: {
            title: msg.title,
            description: msg.description ?? '',
            options: msg.options.map(
              item =>
                new ActionMenuOption({
                  title: item.title,
                  name: item.id,
                  description: item.description ?? '',
                }),
            ),
          },
        })
      } else if (messageType === IdentityProofRequestMessage.type) {
        const msg = JsonTransformer.fromJSON(message, IdentityProofRequestMessage)

        for (const item of msg.requestedProofItems) {
          if (item.type === 'verifiable-credential') {
            const vcItem = item as VerifiableCredentialRequestedProofItem

            const credentialDefinitionId = vcItem.credentialDefinitionId as string
            let attributes = vcItem.attributes as string[]

            if (!credentialDefinitionId) {
              throw Error('Verifiable credential request must include credentialDefinitionId')
            }

            if (attributes && !Array.isArray(attributes)) {
              throw new Error('Received attributes is not an array')
            }

            const { credentialDefinition } =
              await agent.modules.anoncreds.getCredentialDefinition(credentialDefinitionId)

            if (!credentialDefinition) {
              throw Error(`Cannot find information about credential definition ${credentialDefinitionId}.`)
            }

            // Verify that requested attributes are present in credential definition
            const { schema } = await agent.modules.anoncreds.getSchema(credentialDefinition.schemaId)

            if (!schema) {
              throw Error(`Cannot find information about schema ${credentialDefinition.schemaId}.`)
            }

            // If no attributes are specified, request all of them
            if (!attributes) {
              attributes = schema.attrNames
            }

            if (!attributes.every(item => schema.attrNames.includes(item))) {
              throw new Error(
                `Some attributes are not present in the requested credential type: Requested: ${attributes}, Present: ${schema.attrNames}`,
              )
            }

            const requestedAttributes: Record<string, AnonCredsRequestedAttribute> = {}

            requestedAttributes[schema.name] = {
              names: attributes,
              restrictions: [{ cred_def_id: credentialDefinitionId }],
            }

            const record = await agent.proofs.requestProof({
              comment: vcItem.description as string,
              connectionId: msg.connectionId,
              proofFormats: {
                anoncreds: {
                  name: 'proof-request',
                  version: '1.0',
                  requested_attributes: requestedAttributes,
                },
              },
              protocolVersion: 'v2',
              parentThreadId: msg.threadId,
              autoAcceptProof: AutoAcceptProof.Never,
            })
            messageId = record.threadId
            record.metadata.set('_2060/requestedCredentials', {
              credentialDefinitionId,
              attributes,
            } as RequestedCredential)
            await agent.proofs.update(record)
          }
        }
      } else if (messageType === IdentityProofResultMessage.type) {
        throw new Error(`Identity proof Result not supported`)
      } else if (messageType === CredentialIssuanceMessage.type) {
        const msg = JsonTransformer.fromJSON(message, CredentialIssuanceMessage)

        const credential = (await agent.credentials.getAll()).find(item => item.threadId === message.threadId)
        if (credential) {
          await agent.credentials.acceptProposal({
            credentialRecordId: credential.id,
            autoAcceptCredential: AutoAcceptCredential.Always,
          })
        } else {
          if (msg.claims && msg.credentialDefinitionId) {
            const record = await agent.credentials.offerCredential({
              connectionId: msg.connectionId,
              credentialFormats: {
                anoncreds: {
                  attributes: msg.claims.map(item => {
                    return { name: item.name, mimeType: item.mimeType, value: item.value }
                  }),
                  credentialDefinitionId: msg.credentialDefinitionId,
                  revocationRegistryDefinitionId: msg.revocationRegistryDefinitionId,
                  revocationRegistryIndex: msg.revocationRegistryIndex,
                },
              },
              protocolVersion: 'v2',
              autoAcceptCredential: AutoAcceptCredential.Always,
            })
            messageId = record.threadId
          } else {
            throw new Error(
              'Claims and credentialDefinitionId attributes must be present if a credential without related thread is to be issued',
            )
          }
        }
      } else if (messageType === CredentialRevocationMessage.type) {
        const msg = JsonTransformer.fromJSON(message, CredentialRevocationMessage)

        let credentials = await agent.credentials.findAllByQuery({ threadId: msg.threadId })
        if (!credentials?.length && msg.threadId) {
          const record = await agent.genericRecords.findById(msg.threadId)
          const threadId = record?.getTag('messageId') as string
          credentials = await agent.credentials.findAllByQuery({ threadId })
        }
        if (credentials && credentials.length > 0) {
          for (const credential of credentials) {
            const isRevocable = Boolean(
              credential.getTag('anonCredsRevocationRegistryId') &&
                credential.getTag('anonCredsCredentialRevocationId'),
            )
            if (!isRevocable) throw new Error(`Credential for threadId ${msg.threadId} is not revocable)`)

            const uptStatusListResult = await agent.modules.anoncreds.updateRevocationStatusList({
              revocationStatusList: {
                revocationRegistryDefinitionId: credential.getTag('anonCredsRevocationRegistryId') as string,
                revokedCredentialIndexes: [Number(credential.getTag('anonCredsCredentialRevocationId'))],
              },
              options: {},
            })
            if (!uptStatusListResult.revocationStatusListState.revocationStatusList) {
              throw new Error(`Failed to update revocation status list`)
            }

            await agent.credentials.sendRevocationNotification({
              credentialRecordId: credential.id,
              revocationFormat: 'anoncreds',
              revocationId: `${credential.getTag('anonCredsRevocationRegistryId')}::${credential.getTag('anonCredsCredentialRevocationId')}`,
            })
          }
        } else {
          throw new Error(`No credentials were found for connection: ${msg.connectionId}.`)
        }
      } else if (messageType === InvitationMessage.type) {
        const msg = JsonTransformer.fromJSON(message, InvitationMessage)
        const { label, imageUrl, did } = msg

        const messageSender = agent.context.dependencyManager.resolve(MessageSender)

        if (did) {
          // FIXME: This is a workaround due to an issue found in AFJ validator. Replace with class when fixed
          const json = {
            '@type': OutOfBandInvitation.type.messageTypeUri,
            '@id': utils.uuid(),
            label: label ?? '',
            imageUrl: imageUrl,
            services: [did],
            handshake_protocols: ['https://didcomm.org/didexchange/1.0'],
          }

          const invitation = OutOfBandInvitation.fromJson(json)

          // In this special case we use the public did as pthid to indicate recipient to treat as an implicit invitation
          invitation.setThread({ parentThreadId: did })

          await messageSender.sendMessage(
            new OutboundMessageContext(invitation, {
              agentContext: agent.context,
              connection,
            }),
          )

          messageId = invitation.id
        } else {
          const outOfBandRecord = await agent.oob.createInvitation({
            label,
            imageUrl,
          })
          outOfBandRecord.setTag('parentConnectionId', connection.id)
          await agent.dependencyManager.resolve(OutOfBandRepository).update(agent.context, outOfBandRecord)

          await messageSender.sendMessage(
            new OutboundMessageContext(outOfBandRecord.outOfBandInvitation, {
              agentContext: agent.context,
              connection,
            }),
          )

          messageId = outOfBandRecord.id
        }
      } else if (messageType === ProfileMessage.type) {
        const msg = JsonTransformer.fromJSON(message, ProfileMessage)
        const { displayImageUrl, displayName, displayIconUrl, description, preferredLanguage } = msg

        await agent.modules.userProfile.sendUserProfile({
          connectionId: connection.id,
          profileData: {
            displayName: displayName ?? undefined,
            displayPicture: displayImageUrl ? parsePictureData(displayImageUrl) : undefined,
            displayIcon: displayIconUrl ? parsePictureData(displayIconUrl) : undefined,
            description: description ?? undefined,
            preferredLanguage: preferredLanguage ?? undefined,
          },
        })

        // FIXME: No message id is returned here
      } else if (messageType === TerminateConnectionMessage.type) {
        JsonTransformer.fromJSON(message, TerminateConnectionMessage)

        await agent.connections.hangup({ connectionId: connection.id })

        // FIXME: No message id is returned here
      } else if (messageType === CallOfferRequestMessage.type) {
        const msg = JsonTransformer.fromJSON(message, CallOfferRequestMessage)

        const callOffer = await agent.modules.calls.offer({
          connectionId: connection.id,
          offerExpirationTime: msg.offerExpirationTime,
          offerStartTime: msg.offerStartTime,
          description: msg.description,
          callType: 'service',
          parameters: msg.parameters,
        })

        messageId = callOffer.messageId
      } else if (messageType === CallEndRequestMessage.type) {
        const msg = JsonTransformer.fromJSON(message, CallEndRequestMessage)

        const hangup = await agent.modules.calls.hangup({
          connectionId: connection.id,
          threadId: msg.threadId,
        })

        messageId = hangup.messageId
      } else if (messageType === MrzDataRequestMessage.type) {
        const msg = JsonTransformer.fromJSON(message, MrzDataRequestMessage)

        const requestMrz = await agent.modules.mrtd.requestMrzString({
          connectionId: connection.id,
          parentThreadId: msg.threadId,
        })

        messageId = requestMrz.messageId
      } else if (messageType === EMrtdDataRequestMessage.type) {
        const msg = JsonTransformer.fromJSON(message, EMrtdDataRequestMessage)

        const requestEMrtdData = await agent.modules.mrtd.requestEMrtdData({
          connectionId: connection.id,
          parentThreadId: msg.threadId,
        })

        messageId = requestEMrtdData.messageId
      }

      if (messageId) {
        try {
          await agent.genericRecords.save({
            id: messageId,
            content: {},
            tags: { messageId: message.id, connectionId: message.connectionId },
          })
          this.logger.debug!(`messageId saved: ${messageId}`)
        } catch (error) {
          this.logger.warn(`Cannot save message with ${messageId}: ${error.stack}`)
        }
      }
      return { id: messageId ?? utils.uuid() } // TODO: persistant mapping between AFJ records and Service Agent flows. Support external message id setting
    } catch (error) {
      this.logger.error(`Error: ${error.stack}`)
      throw new Error(`something went wrong: ${error}`)
    }
  }
}
