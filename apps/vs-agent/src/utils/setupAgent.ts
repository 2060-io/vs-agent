import { HttpOutboundTransport, LogLevel, ParsedDid, WalletConfig } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import WebSocket from 'ws'

import { ENABLE_SWAGGER } from '../config'

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
  parsedDid,
  autoDiscloseUserProfile,
  masterListCscaLocation,
  autoUpdateStorageOnStartup,
  backupBeforeStorageUpdate,
}: {
  port: number
  walletConfig: WalletConfig
  label: string
  displayPictureUrl?: string
  endpoints: string[]
  logLevel?: LogLevel
  publicApiBaseUrl: string
  autoDiscloseUserProfile?: boolean
  parsedDid?: ParsedDid
  masterListCscaLocation?: string
  autoUpdateStorageOnStartup?: boolean
  backupBeforeStorageUpdate?: boolean
}) => {
  const logger = new TsLogger(logLevel ?? LogLevel.warn, 'Agent')
  const publicDid = parsedDid?.did

  if (endpoints.length === 0) {
    throw new Error('There are no DIDComm endpoints defined. Please set at least one (e.g. wss://myhost)')
  }

  const agent = createVsAgent({
    config: {
      label,
      connectionImageUrl: displayPictureUrl,
      endpoints,
      walletConfig,
      logger,
      autoUpdateStorageOnStartup,
      backupBeforeStorageUpdate,
    },
    did: publicDid,
    autoDiscloseUserProfile,
    dependencies: agentDependencies,
    publicApiBaseUrl,
    masterListCscaLocation,
  })

  const enableHttp = endpoints.find(endpoint => endpoint.startsWith('http'))
  if (enableHttp) {
    logger.info('Inbound HTTP transport enabled')
    agent.registerInboundTransport(new HttpInboundTransport({ port }))
  }

  const enableWs = endpoints.find(endpoint => endpoint.startsWith('ws'))
  if (enableWs) {
    logger.info('Inbound WebSocket transport enabled')
    agent.registerInboundTransport(
      new VsAgentWsInboundTransport({ server: new WebSocket.Server({ noServer: true }) }),
    )
  }

  agent.registerOutboundTransport(new HttpOutboundTransport())
  agent.registerOutboundTransport(new VsAgentWsOutboundTransport())

  await agent.initialize()

  return { agent }
}

export function commonAppConfig(app: INestApplication, cors?: boolean) {
  // Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  })

  // Swagger
  if (ENABLE_SWAGGER) {
    const config = new DocumentBuilder()
      .setTitle('API Documentation')
      .setDescription('API Documentation')
      .setVersion('1.0')
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api', app, document)
  }

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
