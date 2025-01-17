import { ApiVersion } from '@2060.io/service-agent-client'
import { DynamicModule, Type } from '@nestjs/common'

import { EventHandler } from './interfaces'

export interface MessageEventOptions {
  eventHandler?: Type<EventHandler>
  imports?: DynamicModule[]
  url?: string
  version?: ApiVersion
}

export interface ConnectionEventOptions {
  eventHandler?: Type<EventHandler>
  imports?: DynamicModule[]
}

export interface CredentialOptions {
  imports?: DynamicModule[]
  url?: string
  version?: ApiVersion
}

export interface ModulesConfig {
  messages?: boolean
  connections?: boolean
  credentials?: boolean
}

export interface EventsModuleOptions {
  modules: ModulesConfig
  options: {
    eventHandler?: Type<EventHandler>
    imports?: DynamicModule[]
    url?: string
    version?: ApiVersion
  }
}

export enum CredentialStatus {
  OFFERED = 'offered',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  REVOKED = 'revoked',
}
