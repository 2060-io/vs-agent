import type { Express } from 'express'

import { FeatureQueryOptions } from '@credo-ts/core'

import { TsLogger } from './logger'

export interface ServerConfig {
  port: number
  publicApiBaseUrl: string
  cors?: boolean
  app?: Express
  logger: TsLogger
  webhookUrl?: string
  discoveryOptions?: FeatureQueryOptions[]
  endpoints: string[]
}

export interface DidWebServerConfig extends ServerConfig {
  baseUrl: string
}
