import type { Express } from 'express'

import { FeatureQueryOptions } from '@credo-ts/core'

import { TsLogger } from './logger'

export interface ServerConfig {
  port: number
  cors?: boolean
  app?: Express
  logger: TsLogger
  webhookUrl?: string
  discoveryOptions?: FeatureQueryOptions[]
}

export interface DidWebServerConfig extends ServerConfig {
  baseUrl: string
}
