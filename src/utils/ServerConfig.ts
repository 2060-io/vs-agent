import type { Express } from 'express'

import { TsLogger } from './logger'

export interface ServerConfig {
  port: number
  cors?: boolean
  app?: Express
  logger: TsLogger
  webhookUrl?: string
}

export interface DidWebServerConfig extends ServerConfig {
  baseUrl: string
}
