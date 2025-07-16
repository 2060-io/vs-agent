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
import { addSelfVtrRoutes } from '../selfVtrRoutes'

import { HttpInboundTransport } from './HttpInboundTransport'
import { createVsAgent } from './VsAgent'
import { VsAgentWsInboundTransport } from './VsAgentWsInboundTransport'
import { VsAgentWsOutboundTransport } from './VsAgentWsOutboundTransport'
import { TsLogger } from './logger'

export const setupAgent = async ({
  port,
  walletConfig,
  label,
  displayPictureUrl,
  endpoints,
  logLevel,
  publicApiBaseUrl,
  selfVtrEnabled,
  publicDid,
  autoDiscloseUserProfile,
  useCors,
}: {
  port: number
  walletConfig: WalletConfig
  label: string
  displayPictureUrl?: string
  endpoints: string[]
  logLevel?: LogLevel
  publicApiBaseUrl: string
  selfVtrEnabled: boolean
  autoDiscloseUserProfile?: boolean
  publicDid?: string
  useCors?: boolean
}) => {
  const logger = new TsLogger(logLevel ?? LogLevel.warn, 'Agent')

  if (endpoints.length === 0) {
    throw new Error('There are no DIDComm endpoints defined. Please set at least one (e.g. wss://myhost)')
  }

  const agent = createVsAgent({
    config: {
      label,
      connectionImageUrl: displayPictureUrl,
      endpoints,
      walletConfig,
      autoUpdateStorageOnStartup: true,
      logger,
    },
    did: publicDid,
    autoDiscloseUserProfile,
    dependencies: agentDependencies,
    publicApiBaseUrl,
  })

  const app = express()

  if (useCors) app.use(cors())

  app.use(express.json({ limit: '5mb' }))
  app.use(express.urlencoded({ extended: true, limit: '5mb' }))

  app.set('json spaces', 2)

  const enableHttp = endpoints.find(endpoint => endpoint.startsWith('http'))
  const enableWs = endpoints.find(endpoint => endpoint.startsWith('ws'))

  let webSocketServer: WebSocket.Server | undefined
  let httpInboundTransport: HttpInboundTransport | undefined
  if (enableHttp) {
    logger.info('Inbound HTTP transport enabled')
    httpInboundTransport = new HttpInboundTransport({ app, port })
    agent.registerInboundTransport(httpInboundTransport)
  }

  if (enableWs) {
    logger.info('Inbound WebSocket transport enabled')
    webSocketServer = new WebSocket.Server({ noServer: true })
    agent.registerInboundTransport(new VsAgentWsInboundTransport({ server: webSocketServer }))
  }

  agent.registerOutboundTransport(new HttpOutboundTransport())
  agent.registerOutboundTransport(new VsAgentWsOutboundTransport())

  await agent.initialize()

  const httpServer = httpInboundTransport ? httpInboundTransport.server : app.listen(port)

  // Add did:web and AnonCreds Service routes
  addDidWebRoutes(app, agent, publicApiBaseUrl)
  if (selfVtrEnabled) addSelfVtrRoutes(app, agent, publicApiBaseUrl)

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

  // Make sure default User Profile corresponds to settings in environment variables
  const imageUrl = displayPictureUrl
  const displayPicture = imageUrl ? { links: [imageUrl], mimeType: 'image/png' } : undefined

  await agent.modules.userProfile.updateUserProfileData({
    displayName: label,
    displayPicture,
  })

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
    const existingRecord = await didRepository.findCreatedDid(agent.context, publicDid)

    const builder = new DidDocumentBuilder(publicDid)

    builder
      .addContext('https://w3id.org/security/suites/ed25519-2018/v1')
      .addContext('https://w3id.org/security/suites/x25519-2019/v1')

    // If the document already exists (i.e. DID record previously created), take base keys from it
    // and just populate those services that can vary according to the configuration
    const keyAgreementId = `${publicDid}#key-agreement-1`
    if (existingRecord?.didDocument) {
      logger?.debug('Public did record already stored. DidDocument keys will be restored from it')
      const verificationMethods = existingRecord.didDocument.verificationMethod ?? []
      for (const method of verificationMethods) {
        builder.addVerificationMethod(method)
      }

      const authentications = existingRecord.didDocument.authentication ?? []
      for (const auth of authentications) {
        builder.addAuthentication(auth)
      }

      const keyAgreements = existingRecord.didDocument.keyAgreement ?? []
      for (const key of keyAgreements) {
        builder.addKeyAgreement(key)
      }
    } else {
      logger?.debug('Public did record not found. Creating key pair and DidDocument')
      const ed25519 = await agent.context.wallet.createKey({ keyType: KeyType.Ed25519 })
      const verificationMethodId = `${publicDid}#${ed25519.fingerprint}`
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
    }

    // Create a set of keys suitable for did communication
    if (selfVtrEnabled) {
      builder
        .addService(
          new DidDocumentService({
            id: `${publicDid}#vpr-ecs-trust-registry-1234`,
            serviceEndpoint: `${publicApiBaseUrl}/self-vtr`,
            type: 'VerifiablePublicRegistry',
          }),
        )
        .addService(
          new DidDocumentService({
            id: `${publicDid}#vpr-ecs-service-c-vp`,
            serviceEndpoint: `${publicApiBaseUrl}/self-vtr/ecs-service-c-vp.json`,
            type: 'LinkedVerifiablePresentation',
          }),
        )
        .addService(
          new DidDocumentService({
            id: `${publicDid}#vpr-ecs-org-c-vp`,
            serviceEndpoint: `${publicApiBaseUrl}/self-vtr/ecs-org-c-vp.json`,
            type: 'LinkedVerifiablePresentation',
          }),
        )
    }

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

    if (publicApiBaseUrl) {
      builder.addService(
        new DidDocumentService({
          id: `${publicDid}#anoncreds`,
          serviceEndpoint: `${publicApiBaseUrl}/anoncreds/v1`,
          type: 'AnonCredsRegistry',
        }),
      )
    }

    if (existingRecord) {
      logger?.debug('Public did record updated')
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
