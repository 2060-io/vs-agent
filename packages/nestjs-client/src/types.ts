import { ApiVersion } from '@2060.io/service-agent-client'
import { ProfileMessageOptions } from '@2060.io/service-agent-model'
import { DynamicModule, Type } from '@nestjs/common'

import { EventHandler } from './interfaces'

export interface MessageEventOptions {
  eventHandler?: Type<EventHandler>
  imports?: DynamicModule[]
  url?: string
  version?: ApiVersion
}

export type UserProfile = Omit<ProfileMessageOptions, 'id' | 'connectionId'>

export interface ConnectionEventOptions {
  eventHandler?: Type<EventHandler>
  imports?: DynamicModule[]
  useMessages?: boolean
}

export interface StatEventOptions {
  imports?: DynamicModule[]
  statOptions?: {
    host?: string
    port?: number
    queue?: string
    username?: string
    password?: string
    reconnectLimit?: number
    threads?: number
    delay?: number
  }
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
  stats?: boolean
}

export interface EventsModuleOptions {
  modules: ModulesConfig
  options: {
    eventHandler?: Type<EventHandler>
    imports?: DynamicModule[]
    url?: string
    version?: ApiVersion
    statOptions?: {
      host?: string
      port?: number
      queue?: string
      username?: string
      password?: string
      reconnectLimit?: number
      threads?: number
      delay?: number
    }
  }
}

export enum CredentialStatus {
  OFFERED = 'offered',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  REVOKED = 'revoked',
}
