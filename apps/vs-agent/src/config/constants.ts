import type { AskarWalletPostgresStorageConfig } from '@credo-ts/askar'

import { LogLevel, KeyDerivationMethod } from '@credo-ts/core'
import dotenv from 'dotenv'

dotenv.config()

// Basic parameters

export const AGENT_PORT = Number(process.env.AGENT_PORT || 3001)
export const ADMIN_PORT = Number(process.env.ADMIN_PORT || 3000)

export const AGENT_NAME = process.env.AGENT_NAME // This one is deprecated. Only used to throw error if it is defined
export const AGENT_LABEL = process.env.AGENT_LABEL || 'Test VS Agent'
export const AGENT_INVITATION_IMAGE_URL = process.env.AGENT_INVITATION_IMAGE_URL
export const AGENT_ENDPOINT = process.env.AGENT_ENDPOINT
export const AGENT_ENDPOINTS = process.env.AGENT_ENDPOINT
  ? [process.env.AGENT_ENDPOINT]
  : (process.env.AGENT_ENDPOINTS?.replace(' ', '').split(',') ?? ['ws://localhost:3001'])

export const AGENT_PUBLIC_DID = process.env.AGENT_PUBLIC_DID
export const PUBLIC_API_BASE_URL = process.env.PUBLIC_API_BASE_URL || 'http://localhost:3001'

export const EVENTS_BASE_URL = process.env.EVENTS_BASE_URL || 'http://localhost:5000'

// Wallet and Database
export const AGENT_WALLET_ID = process.env.AGENT_WALLET_ID
export const AGENT_WALLET_KEY = process.env.AGENT_WALLET_KEY
export const AGENT_WALLET_KEY_DERIVATION_METHOD = process.env.AGENT_WALLET_KEY_DERIVATION_METHOD
export const POSTGRES_HOST = process.env.POSTGRES_HOST
export const POSTGRES_USER = process.env.POSTGRES_USER
export const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD
export const POSTGRES_ADMIN_USER = process.env.POSTGRES_ADMIN_USER
export const POSTGRES_ADMIN_PASSWORD = process.env.POSTGRES_ADMIN_PASSWORD

export const askarPostgresConfig: AskarWalletPostgresStorageConfig = {
  type: 'postgres',
  config: {
    host: POSTGRES_HOST as string,
    connectTimeout: 10,
  },
  credentials: {
    account: POSTGRES_USER as string,
    password: POSTGRES_PASSWORD as string,
    adminAccount: POSTGRES_USER as string,
    adminPassword: POSTGRES_PASSWORD as string,
  },
}

export const keyDerivationMethodMap: { [key: string]: KeyDerivationMethod } = {
  ARGON2I_INT: KeyDerivationMethod.Argon2IInt,
  ARGON2I_MOD: KeyDerivationMethod.Argon2IMod,
  RAW: KeyDerivationMethod.Raw,
}

export const REDIS_HOST = process.env.REDIS_HOST
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD

// Dev/debugging settings
export const AGENT_LOG_LEVEL = process.env.AGENT_LOG_LEVEL
  ? Number(process.env.AGENT_LOG_LEVEL)
  : LogLevel.warn
export const ADMIN_LOG_LEVEL = process.env.ADMIN_LOG_LEVEL
  ? Number(process.env.ADMIN_LOG_LEVEL)
  : LogLevel.debug

export const USE_CORS = Boolean(process.env.USE_CORS || false)

// Advanced settings
export const AGENT_INVITATION_BASE_URL = process.env.AGENT_INVITATION_BASE_URL ?? 'https://hologram.zone/'
export const REDIRECT_DEFAULT_URL_TO_INVITATION_URL =
  process.env.REDIRECT_DEFAULT_URL_TO_INVITATION_URL !== 'false'
export const SELF_VTR_ENABLED = process.env.SELF_VTR_ENABLED === 'true'
export const USER_PROFILE_AUTODISCLOSE = process.env.USER_PROFILE_AUTODISCLOSE === 'true'
