import 'reflect-metadata'

import type { ServerConfig } from './utils/ServerConfig'

import { setupAgent } from './utils/agent'
import { ServiceAgent } from './utils/ServiceAgent'
import { LogLevel } from '@credo-ts/core'
import { TsLogger } from './utils/logger'
import { VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ServiceAgentModule } from './app.module'
import { connectionEvents } from './events/ConnectionEvents'
import { messageEvents } from './events/MessageEvents'

export const startAdminServer = async (agent: ServiceAgent, serverConfig: ServerConfig) => {
  const app = await NestFactory.create(
    ServiceAgentModule.register(agent)
  )

  // Version
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API Documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Port expose
  await app.listen(serverConfig.port);
}

const run = async () => {
  const endpoints = process.env.AGENT_ENDPOINT ? [process.env.AGENT_ENDPOINT] : process.env.AGENT_ENDPOINTS?.replace(' ', '').split(',') ?? ['ws://localhost:3001']
  const { agent } = await setupAgent({
    endpoints,
    port: Number(process.env.AGENT_PORT) || 3001,
    name: process.env.AGENT_NAME || 'Test Service Agent',
    publicDid: process.env.AGENT_PUBLIC_DID,
    logLevel: process.env.AGENT_LOG_LEVEL ? Number(process.env.AGENT_LOG_LEVEL) : LogLevel.warn,
    enableHttp: 'ENABLE_HTTP' in process.env ? Boolean(process.env.ENABLE_HTTP === 'true' || process.env.ENABLE_HTTP === '1') : true,
    enableWs: 'ENABLE_WS' in process.env ? Boolean(process.env.ENABLE_WS === 'true' || process.env.ENABLE_WS === '1') : true,
    anoncredsServiceBaseUrl: process.env.ANONCREDS_SERVICE_BASE_URL
  })

  const serverLogger = new TsLogger(process.env.ADMIN_LOG_LEVEL ? Number(process.env.ADMIN_LOG_LEVEL) : LogLevel.debug)

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

  console.log(
    `Service Agent running in port ${Number(process.env.AGENT_PORT || 3001)}. Admin interface at port ${conf.port}`
  )
}

run()
