import type { Express } from 'express'

import { TsLogger } from './logger'
import { DidCommFeatureQueryOptions } from '@credo-ts/didcomm'

export interface ServerConfig {
  port: number
  publicApiBaseUrl: string
  cors?: boolean
  app?: Express
  logger: TsLogger
  webhookUrl?: string
  discoveryOptions?: DidCommFeatureQueryOptions[]
  endpoints: string[]
}

export interface DidWebServerConfig extends ServerConfig {
  baseUrl: string
}
