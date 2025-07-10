import 'reflect-metadata'

import type { ServerConfig } from './utils/ServerConfig'

import { HttpOutboundTransport, KeyDerivationMethod, LogLevel, utils } from '@credo-ts/core'
import { HttpInboundTransport } from '@credo-ts/node'
import { DynamicModule, INestApplication, ValidationPipe, VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import express from 'express'
import * as fs from 'fs'
import { IncomingMessage } from 'http'
import * as net from 'net'
import * as path from 'path'
import WebSocket from 'ws'

import packageJson from '../package.json'

import { VsAgentModule } from './app.module'
import {
  ADMIN_LOG_LEVEL,
  ADMIN_PORT,
  AGENT_ENDPOINT,
  AGENT_ENDPOINTS,
  AGENT_INVITATION_IMAGE_URL,
  AGENT_LABEL,
  AGENT_LOG_LEVEL,
  AGENT_NAME,
  AGENT_PORT,
  AGENT_PUBLIC_DID,
  AGENT_WALLET_ID,
  AGENT_WALLET_KEY,
  AGENT_WALLET_KEY_DERIVATION_METHOD,
  askarPostgresConfig,
  EVENTS_BASE_URL,
  keyDerivationMethodMap,
  POSTGRES_HOST,
  PUBLIC_API_BASE_URL,
  SELF_VTR_ENABLED,
  USE_CORS,
  USER_PROFILE_AUTODISCLOSE,
} from './config/constants'
import { DidCommModule } from './didcomm.module'
import { connectionEvents } from './events/ConnectionEvents'
import { messageEvents } from './events/MessageEvents'
import { vcAuthnEvents } from './events/VCAuthnEvents'
import { VsAgent } from './utils/VsAgent'
import { VsAgentWsInboundTransport } from './utils/VsAgentWsInboundTransport'
import { VsAgentWsOutboundTransport } from './utils/VsAgentWsOutboundTransport'
import { TsLogger } from './utils/logger'
import { setupAgent } from './utils/setupAgent'

export const enableHttpAndWs = async (
  app: INestApplication,
  agent: VsAgent,
  endpoints: string[],
  port: number,
  logLevel?: LogLevel,
) => {
  const logger = new TsLogger(logLevel ?? LogLevel.warn, 'Agent')

  const enableHttp = endpoints.find(endpoint => endpoint.startsWith('http'))
  const enableWs = endpoints.find(endpoint => endpoint.startsWith('ws'))

  let webSocketServer: WebSocket.Server | undefined
  let httpInboundTransport: HttpInboundTransport | undefined
  if (enableHttp) {
    logger.info('Inbound HTTP transport enabled')
    const expressApp = app.getHttpAdapter().getInstance()
    httpInboundTransport = new HttpInboundTransport({ app: expressApp, port })
    agent.registerInboundTransport(httpInboundTransport)
  }

  if (enableWs) {
    logger.info('Inbound WebSocket transport enabled')
    webSocketServer = new WebSocket.Server({ noServer: true })
    agent.registerInboundTransport(new VsAgentWsInboundTransport({ server: webSocketServer }))
  }

  agent.registerOutboundTransport(new HttpOutboundTransport())
  agent.registerOutboundTransport(new VsAgentWsOutboundTransport())

  // await agent.initialize()

  const httpServer = httpInboundTransport ? httpInboundTransport.server : await app.listen(port)

  // Add WebSocket support if required
  if (enableWs) {
    httpServer.on('upgrade', (request: IncomingMessage, socket: net.Socket, head: Buffer) => {
      webSocketServer?.handleUpgrade(request, socket, head, ws => {
        const socketId = utils.uuid()
        webSocketServer?.emit('connection', ws, request, socketId)
      })
    })
  }
}

export const startAdminServer = async (dynamicModule: DynamicModule, serverConfig: ServerConfig) => {
  const app = await NestFactory.create(dynamicModule)

  // Version
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

  // agent didcomm
  app.use(express.json({ limit: '5mb' }))
  app.use(express.urlencoded({ extended: true, limit: '5mb' }))
  app.getHttpAdapter().getInstance().set('json spaces', 2)

  // Dto
  app.useGlobalPipes(new ValidationPipe())

  // Cors
  if (serverConfig.cors) {
    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type,Authorization',
    })
  }

  // Port expose
  return app
}

const run = async () => {
  const serverLogger = new TsLogger(ADMIN_LOG_LEVEL, 'Server')

  if (AGENT_NAME) {
    serverLogger.error(
      'AGENT_NAME variable is defined and it is not supported anymore. Please use AGENT_WALLET_ID and AGENT_WALLET_KEY instead',
    )
    process.exit(1)
  }

  if (AGENT_ENDPOINT) {
    serverLogger.warn(
      'AGENT_ENDPOINT variable is defined and it is deprecated. Please use AGENT_ENDPOINTS instead.',
    )
  }

  const { agent } = await setupAgent({
    endpoints: AGENT_ENDPOINTS,
    port: Number(AGENT_PORT) || 3001,
    walletConfig: {
      id: AGENT_WALLET_ID || 'test-vs-agent',
      key: AGENT_WALLET_KEY || 'test-vs-agent',
      keyDerivationMethod:
        keyDerivationMethodMap[AGENT_WALLET_KEY_DERIVATION_METHOD ?? KeyDerivationMethod.Argon2IMod],
      storage: POSTGRES_HOST ? askarPostgresConfig : undefined,
    },
    label: AGENT_LABEL || 'Test VS Agent',
    displayPictureUrl: AGENT_INVITATION_IMAGE_URL,
    publicDid: AGENT_PUBLIC_DID,
    logLevel: AGENT_LOG_LEVEL,
    publicApiBaseUrl: PUBLIC_API_BASE_URL,
    selfVtrEnabled: SELF_VTR_ENABLED,
    autoDiscloseUserProfile: USER_PROFILE_AUTODISCLOSE,
  })

  const discoveryOptions = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'discovery.json'), 'utf-8'))
    } catch (error) {
      console.warn('Error reading discovery.json file:', error.message)
      return undefined
    }
  })()
  const conf: ServerConfig = {
    port: ADMIN_PORT,
    cors: USE_CORS,
    logger: serverLogger,
    webhookUrl: EVENTS_BASE_URL,
    discoveryOptions,
  }

  // Start admin server
  const app = await startAdminServer(VsAgentModule.register(agent), conf)
  await app.listen(conf.port)

  // Start admin didcomm agent server
  const didCommApp = await startAdminServer(DidCommModule.register(agent), {
    port: AGENT_PORT,
    cors: USE_CORS,
    logger: serverLogger,
  })
  enableHttpAndWs(didCommApp, agent, AGENT_ENDPOINTS, AGENT_PORT, AGENT_LOG_LEVEL)

  // Listen to events emitted by the agent
  connectionEvents(agent, conf)
  messageEvents(agent, conf)

  // VCAuthn related events (TODO: make configurable)
  vcAuthnEvents(agent, conf)

  console.log(
    `VS Agent v${packageJson['version']} running in port ${AGENT_PORT}. Admin interface at port ${conf.port}`,
  )
}

run()
