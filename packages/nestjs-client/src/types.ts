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

export interface CredentialEventOptions {
  imports?: DynamicModule[]
  url?: string
  version?: ApiVersion
  creds?: {
    name?: string
    version?: string
    attributes?: string[]
    supportRevocation?: boolean
    maximumCredentialNumber?: number
  }
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
    creds?: {
      name?: string
      version?: string
      attributes?: string[]
      supportRevocation?: boolean
      maximumCredentialNumber?: number
    }
  }
}
