import 'reflect-metadata'

import type { ServerConfig } from './utils/ServerConfig'

import { KeyDerivationMethod, parseDid, utils } from '@credo-ts/core'
import { NestFactory } from '@nestjs/core'
import express from 'express'
import * as fs from 'fs'
import { IncomingMessage } from 'http'
import { Socket } from 'net'
import * as path from 'path'

import packageJson from '../package.json'

import { VsAgentModule } from './admin.module'
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
  DEFAULT_AGENT_ENDPOINTS,
  DEFAULT_PUBLIC_API_BASE_URL,
  EVENTS_BASE_URL,
  keyDerivationMethodMap,
  POSTGRES_HOST,
  PUBLIC_API_BASE_URL,
  USE_CORS,
  USER_PROFILE_AUTODISCLOSE,
  MASTER_LIST_CSCA_LOCATION,
} from './config/constants'
import { connectionEvents } from './events/ConnectionEvents'
import { messageEvents } from './events/MessageEvents'
import { vcAuthnEvents } from './events/VCAuthnEvents'
import { PublicModule } from './public.module'
import { HttpInboundTransport } from './utils/HttpInboundTransport'
import { VsAgent } from './utils/VsAgent'
import { VsAgentWsInboundTransport } from './utils/VsAgentWsInboundTransport'
import { TsLogger } from './utils/logger'
import { commonAppConfig, setupAgent } from './utils/setupAgent'
import { setupSelfTr } from './utils/setupSelfTr'

export const startServers = async (agent: VsAgent, serverConfig: ServerConfig) => {
  const { port, cors, endpoints, publicApiBaseUrl } = serverConfig

  const adminApp = await NestFactory.create(VsAgentModule.register(agent, publicApiBaseUrl))
  commonAppConfig(adminApp, cors)
  await adminApp.listen(port)

  // PublicModule-specific config
  const publicApp = await NestFactory.create(PublicModule.register(agent, publicApiBaseUrl))
  commonAppConfig(publicApp, cors)
  publicApp.use(express.json({ limit: '5mb' }))
  publicApp.use(express.urlencoded({ extended: true, limit: '5mb' }))
  publicApp.getHttpAdapter().getInstance().set('json spaces', 2)

  const enableHttp = endpoints.find(endpoint => endpoint.startsWith('http'))
  const enableWs = endpoints.find(endpoint => endpoint.startsWith('ws'))

  const webSocketServer = agent.inboundTransports
    .find(x => x instanceof VsAgentWsInboundTransport)
    ?.getServer()
  const httpInboundTransport = agent.inboundTransports.find(x => x instanceof HttpInboundTransport)

  if (enableHttp) {
    httpInboundTransport?.setApp(publicApp.getHttpAdapter().getInstance())
  }

  const httpServer = httpInboundTransport ? httpInboundTransport.server : await publicApp.listen(AGENT_PORT)

  // Add WebSocket support if required
  if (enableWs) {
    httpServer?.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
      webSocketServer?.handleUpgrade(request, socket as Socket, head, socketParam => {
        const socketId = utils.uuid()
        webSocketServer?.emit('connection', socketParam, request, socketId)
      })
    })
  }
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

  const publicDid = AGENT_PUBLIC_DID ? parseDid(AGENT_PUBLIC_DID) : null

  if (!AGENT_PUBLIC_DID) {
    serverLogger.warn('AGENT_PUBLIC_DID is not defined. You must set it in production releases')
  }

  // Check it is a supported DID method
  if (publicDid && publicDid.method !== 'web') {
    serverLogger.error('Only did:web method is supported')
    process.exit(1)
  }

  let endpoints = AGENT_ENDPOINTS
  if (!endpoints && publicDid) endpoints = [`wss://${decodeURIComponent(publicDid.id)}`]
  if (!endpoints) endpoints = DEFAULT_AGENT_ENDPOINTS

  let publicApiBaseUrl = PUBLIC_API_BASE_URL
  if (!publicApiBaseUrl && publicDid) publicApiBaseUrl = `https://${decodeURIComponent(publicDid.id)}`
  if (!publicApiBaseUrl) publicApiBaseUrl = DEFAULT_PUBLIC_API_BASE_URL

  serverLogger.info(`endpoints: ${endpoints} publicApiBaseUrl ${publicApiBaseUrl}`)
  const { agent } = await setupAgent({
    endpoints,
    port: AGENT_PORT,
    walletConfig: {
      id: AGENT_WALLET_ID || 'test-vs-agent',
      key: AGENT_WALLET_KEY || 'test-vs-agent',
      keyDerivationMethod:
        keyDerivationMethodMap[AGENT_WALLET_KEY_DERIVATION_METHOD ?? KeyDerivationMethod.Argon2IMod],
      storage: POSTGRES_HOST ? askarPostgresConfig : undefined,
    },
    label: AGENT_LABEL || 'Test VS Agent',
    displayPictureUrl: AGENT_INVITATION_IMAGE_URL,
    publicDid: publicDid?.did,
    logLevel: AGENT_LOG_LEVEL,
    publicApiBaseUrl,
    autoDiscloseUserProfile: USER_PROFILE_AUTODISCLOSE,
    masterListCscaLocation: MASTER_LIST_CSCA_LOCATION,
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
    publicApiBaseUrl,
    discoveryOptions,
    endpoints,
  }

  await startServers(agent, conf)

  // Initialize Self-Trust Registry
  await setupSelfTr({ agent, publicApiBaseUrl })

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
