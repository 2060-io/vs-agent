import 'reflect-metadata'

import type { ServerConfig } from './utils/ServerConfig'

import { KeyDerivationMethod } from '@credo-ts/core'
import { NestFactory } from '@nestjs/core'
import * as fs from 'fs'
import * as path from 'path'

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
import { connectionEvents } from './events/ConnectionEvents'
import { messageEvents } from './events/MessageEvents'
import { vcAuthnEvents } from './events/VCAuthnEvents'
import { VsAgent } from './utils/VsAgent'
import { TsLogger } from './utils/logger'
import { commonAppConfig, setupAgent } from './utils/setupAgent'

export const startAdminServer = async (agent: VsAgent, serverConfig: ServerConfig) => {
  const app = await NestFactory.create(VsAgentModule.register(agent))
  // Port expose
  commonAppConfig(app, serverConfig)
  await app.listen(serverConfig.port)
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
  await startAdminServer(agent, conf)

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
