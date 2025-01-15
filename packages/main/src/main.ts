import 'reflect-metadata'

import type { ServerConfig } from './utils/ServerConfig'

import { KeyDerivationMethod, LogLevel } from '@credo-ts/core'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import packageJson from '../package.json'

import { ServiceAgentModule } from './app.module'
import { connectionEvents } from './events/ConnectionEvents'
import { messageEvents } from './events/MessageEvents'
import { vcAuthnEvents } from './events/VCAuthnEvents'
import { ServiceAgent } from './utils/ServiceAgent'
import { TsLogger } from './utils/logger'
import { setupAgent } from './utils/setupAgent'
import {
  AGENT_WALLET_ID,
  AGENT_WALLET_KEY,
  AGENT_WALLET_KEY_DERIVATION_METHOD,
  askarPostgresConfig,
  keyDerivationMethodMap,
  POSTGRES_HOST,
} from './utils/walletConfig'

export const startAdminServer = async (agent: ServiceAgent, serverConfig: ServerConfig) => {
  const app = await NestFactory.create(ServiceAgentModule.register(agent))

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

  // Dto
  app.useGlobalPipes(new ValidationPipe())

  // Cors
  app.enableCors()
  
  // Port expose
  await app.listen(serverConfig.port)
}

const run = async () => {
  const endpoints = process.env.AGENT_ENDPOINT
    ? [process.env.AGENT_ENDPOINT]
    : (process.env.AGENT_ENDPOINTS?.replace(' ', '').split(',') ?? ['ws://localhost:3001'])
  const { agent } = await setupAgent({
    endpoints,
    port: Number(process.env.AGENT_PORT) || 3001,
    walletConfig: {
      id: AGENT_WALLET_ID || process.env.AGENT_NAME || 'test-service-agent',
      key: AGENT_WALLET_KEY || process.env.AGENT_NAME || 'test-service-agent',
      keyDerivationMethod:
        keyDerivationMethodMap[AGENT_WALLET_KEY_DERIVATION_METHOD ?? KeyDerivationMethod.Argon2IMod],
      storage: POSTGRES_HOST ? askarPostgresConfig : undefined,
    },
    label: process.env.AGENT_LABEL || 'Test Service Agent',
    displayPictureUrl: process.env.AGENT_INVITATION_IMAGE_URL,
    publicDid: process.env.AGENT_PUBLIC_DID,
    logLevel: process.env.AGENT_LOG_LEVEL ? Number(process.env.AGENT_LOG_LEVEL) : LogLevel.warn,
    enableHttp:
      'ENABLE_HTTP' in process.env
        ? Boolean(process.env.ENABLE_HTTP === 'true' || process.env.ENABLE_HTTP === '1')
        : true,
    enableWs:
      'ENABLE_WS' in process.env
        ? Boolean(process.env.ENABLE_WS === 'true' || process.env.ENABLE_WS === '1')
        : true,
    anoncredsServiceBaseUrl: process.env.ANONCREDS_SERVICE_BASE_URL,
  })

  const serverLogger = new TsLogger(
    process.env.ADMIN_LOG_LEVEL ? Number(process.env.ADMIN_LOG_LEVEL) : LogLevel.debug,
    'Server',
  )

  const conf: ServerConfig = {
    port: Number(process.env.ADMIN_PORT || 3000),
    cors: Boolean(process.env.USE_CORS || false),
    logger: serverLogger,
    webhookUrl: process.env.EVENTS_BASE_URL || 'http://localhost:5000',
  }

  await startAdminServer(agent, conf)

  // Listen to events emitted by the agent
  connectionEvents(agent, conf)
  messageEvents(agent, conf)

  // VCAuthn related events (TODO: make configurable)
  vcAuthnEvents(agent, conf)

  console.log(
    `Service Agent v${packageJson['version']} running in port ${Number(process.env.AGENT_PORT || 3001)}. Admin interface at port ${conf.port}`,
  )
}

run()
