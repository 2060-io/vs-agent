import {
  ConnectionEventTypes,
  ConnectionStateChangedEvent,
  convertPublicKeyToX25519,
  DidCommV1Service,
  DidDocumentBuilder,
  DidDocumentRole,
  DidDocumentService,
  DidExchangeState,
  DidRecord,
  DidRepository,
  HttpOutboundTransport,
  KeyType,
  LogLevel,
  TypedArrayEncoder,
  utils,
  WalletConfig,
} from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import cors from 'cors'
import express from 'express'
import { Socket } from 'net'
import WebSocket from 'ws'

import { addDidWebRoutes } from '../didWebServer'
import { addInvitationRoutes } from '../invitationRoutes'

import { HttpInboundTransport } from './HttpInboundTransport'
import { createServiceAgent } from './ServiceAgent'
import { ServiceAgentWsInboundTransport } from './ServiceAgentWsInboundTransport'
import { ServiceAgentWsOutboundTransport } from './ServiceAgentWsOutboundTransport'
import { TsLogger } from './logger'

export const setupAgent = async ({
  port,
  walletConfig,
  label,
  displayPictureUrl,
  endpoints,
  logLevel,
  anoncredsServiceBaseUrl,
  publicDid,
  enableWs,
  enableHttp,
  useCors,
}: {
  port: number
  walletConfig: WalletConfig
  label: string
  displayPictureUrl?: string
  endpoints: string[]
  logLevel?: LogLevel
  anoncredsServiceBaseUrl?: string
  publicDid?: string
  enableWs?: boolean
  enableHttp?: boolean
  useCors?: boolean
}) => {
  const logger = new TsLogger(logLevel ?? LogLevel.warn, 'Agent')

  if (!enableHttp && !enableWs) {
    throw new Error('No transport has been enabled. Set at least one of HTTP and WS')
  }

  const agent = createServiceAgent({
    config: {
      label,
      connectionImageUrl: displayPictureUrl,
      endpoints,
      walletConfig,
      autoUpdateStorageOnStartup: true,
      logger,
    },
    did: publicDid,
    dependencies: agentDependencies,
  })

  const app = express()

  if (useCors) app.use(cors())

  app.use(express.json({ limit: '5mb' }))
  app.use(express.urlencoded({ extended: true, limit: '5mb' }))

  app.set('json spaces', 2)

  let webSocketServer: WebSocket.Server | undefined
  let httpInboundTransport: HttpInboundTransport | undefined
  if (enableHttp) {
    httpInboundTransport = new HttpInboundTransport({ app, port })
    agent.registerInboundTransport(httpInboundTransport)
    agent.registerOutboundTransport(new HttpOutboundTransport())
  }

  if (enableWs) {
    webSocketServer = new WebSocket.Server({ noServer: true })
    agent.registerInboundTransport(new ServiceAgentWsInboundTransport({ server: webSocketServer }))
    agent.registerOutboundTransport(new ServiceAgentWsOutboundTransport())
  }

  await agent.initialize()

  const httpServer = httpInboundTransport ? httpInboundTransport.server : app.listen(port)

  // Add did:web and AnonCreds Service routes
  addDidWebRoutes(app, agent, anoncredsServiceBaseUrl)

  addInvitationRoutes(app, agent)

  // Add WebSocket support if required
  if (enableWs) {
    httpServer?.on('upgrade', (request, socket, head) => {
      webSocketServer?.handleUpgrade(request, socket as Socket, head, socketParam => {
        const socketId = utils.uuid()
        webSocketServer?.emit('connection', socketParam, request, socketId)
      })
    })
  }

  const currentUserProfile = await agent.modules.userProfile.getUserProfileData()

  // Profile not initialized yet: add default values based on environment variables
  if (!currentUserProfile.displayName) {
    const imageUrl = displayPictureUrl ?? process.env.AGENT_INVITATION_IMAGE_URL
    const displayPicture = imageUrl ? { links: [imageUrl], mimeType: 'image/png' } : undefined

    await agent.modules.userProfile.updateUserProfileData({
      displayName: label,
      displayPicture,
    })
  }

  if (publicDid) {
    // If a public did is specified, check if it's already stored in the wallet. If it's not the case,
    // create a new one and generate keys for DIDComm (if there are endpoints configured)
    // TODO: Make DIDComm version, keys, etc. configurable. Keys can also be imported

    // Auto-accept connections that go to the public did
    agent.events.on(
      ConnectionEventTypes.ConnectionStateChanged,
      async (data: ConnectionStateChangedEvent) => {
        logger.debug(`Incoming connection event: ${data.payload.connectionRecord.state}}`)
        const oob = await agent.oob.findById(data.payload.connectionRecord.outOfBandId!)
        if (
          oob?.outOfBandInvitation.id === publicDid &&
          data.payload.connectionRecord.state === DidExchangeState.RequestReceived
        ) {
          logger.debug(`Incoming connection request for ${publicDid}`)
          await agent.connections.acceptRequest(data.payload.connectionRecord.id)
          logger.debug(`Accepted request for ${publicDid}`)
        }
      },
    )

    const didRepository = agent.context.dependencyManager.resolve(DidRepository)
    const builder = new DidDocumentBuilder(publicDid)

    // Create a set of keys suitable for did communication
    if (endpoints && endpoints.length > 0) {
      const verificationMethodId = `${publicDid}#verkey`
      const keyAgreementId = `${publicDid}#key-agreement-1`

      const ed25519 = await agent.context.wallet.createKey({ keyType: KeyType.Ed25519 })
      const publicKeyX25519 = TypedArrayEncoder.toBase58(
        convertPublicKeyToX25519(TypedArrayEncoder.fromBase58(ed25519.publicKeyBase58)),
      )

      builder
        .addContext('https://w3id.org/security/suites/ed25519-2018/v1')
        .addContext('https://w3id.org/security/suites/x25519-2019/v1')
        .addVerificationMethod({
          controller: publicDid,
          id: verificationMethodId,
          publicKeyBase58: ed25519.publicKeyBase58,
          type: 'Ed25519VerificationKey2018',
        })
        .addVerificationMethod({
          controller: publicDid,
          id: keyAgreementId,
          publicKeyBase58: publicKeyX25519,
          type: 'X25519KeyAgreementKey2019',
        })
        .addAuthentication(verificationMethodId)
        .addAssertionMethod(verificationMethodId)
        .addKeyAgreement(keyAgreementId)

      for (let i = 0; i < agent.config.endpoints.length; i++) {
        builder.addService(
          new DidCommV1Service({
            id: `${publicDid}#did-communication`,
            serviceEndpoint: agent.config.endpoints[i],
            priority: i,
            routingKeys: [], // TODO: Support mediation
            recipientKeys: [keyAgreementId],
            accept: ['didcomm/aip2;env=rfc19'],
          }),
        )
      }

      if (anoncredsServiceBaseUrl) {
        builder.addService(
          new DidDocumentService({
            id: `${publicDid}#anoncreds`,
            serviceEndpoint: `${anoncredsServiceBaseUrl}/anoncreds/v1`,
            type: 'AnonCredsRegistry',
          }),
        )
      }
    }

    const existingRecord = await didRepository.findCreatedDid(agent.context, publicDid)
    if (existingRecord) {
      logger?.debug('Public did record already stored. DidDocument updated')
      existingRecord.didDocument = builder.build()
      await didRepository.update(agent.context, existingRecord)
    } else {
      await didRepository.save(
        agent.context,
        new DidRecord({
          did: publicDid,
          role: DidDocumentRole.Created,
          didDocument: builder.build(),
        }),
      )
      logger?.debug('Public did record saved')
    }
  }

  return { agent, app, webSocketServer }
}
