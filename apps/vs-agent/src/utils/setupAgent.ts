import {
  convertPublicKeyToX25519,
  DidCommV1Service,
  DidDocumentBuilder,
  DidDocumentRole,
  DidDocumentService,
  DidRecord,
  DidRepository,
  HttpOutboundTransport,
  KeyType,
  LogLevel,
  TypedArrayEncoder,
  WalletConfig,
} from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import WebSocket from 'ws'

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
  publicDid,
  autoDiscloseUserProfile,
  masterListCscaLocation,
}: {
  port: number
  walletConfig: WalletConfig
  label: string
  displayPictureUrl?: string
  endpoints: string[]
  logLevel?: LogLevel
  publicApiBaseUrl: string
  autoDiscloseUserProfile?: boolean
  publicDid?: string
  masterListCscaLocation?: string
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
    masterListCscaLocation,
  })

  const enableHttp = endpoints.find(endpoint => endpoint.startsWith('http'))
  const enableWs = endpoints.find(endpoint => endpoint.startsWith('ws'))

  let webSocketServer: WebSocket.Server | undefined
  let httpInboundTransport: HttpInboundTransport | undefined
  if (enableHttp) {
    logger.info('Inbound HTTP transport enabled')
    httpInboundTransport = new HttpInboundTransport({ port })
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

      const assertionMethods = existingRecord.didDocument.assertionMethod ?? []
      for (const assert of assertionMethods) {
        builder.addAssertionMethod(assert)
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

    // Create a set of keys suitable for did self issued
    builder
      .addService(
        new DidDocumentService({
          id: `${publicDid}#vpr-ecs-trust-registry-1234`,
          serviceEndpoint: `${publicApiBaseUrl}/self-tr`,
          type: 'VerifiablePublicRegistry',
        }),
      )
      .addService(
        new DidDocumentService({
          id: `${publicDid}#vpr-ecs-service-c-vp`,
          serviceEndpoint: `${publicApiBaseUrl}/self-tr/ecs-service-c-vp.json`,
          type: 'LinkedVerifiablePresentation',
        }),
      )
      .addService(
        new DidDocumentService({
          id: `${publicDid}#vpr-ecs-org-c-vp`,
          serviceEndpoint: `${publicApiBaseUrl}/self-tr/ecs-org-c-vp.json`,
          type: 'LinkedVerifiablePresentation',
        }),
      )

    // Create a set of keys suitable for did communication
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

  return { agent }
}

export function commonAppConfig(app: INestApplication, cors?: boolean) {
  // Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  })

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API Documentation')
    .setVersion('1.0')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)

  // Pipes
  app.useGlobalPipes(new ValidationPipe())

  // CORS
  if (cors) {
    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type,Authorization',
    })
  }
  return app
}
