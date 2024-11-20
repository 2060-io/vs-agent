import { ApiVersion, EventHandler } from '@2060.io/service-agent-client'
import { DynamicModule, Type } from '@nestjs/common'

export interface MessageModuleOptions {
  eventHandler: Type<EventHandler>
  imports: DynamicModule[]
  url: string
  version: ApiVersion
}

export const MESSAGE_MODULE_OPTIONS = 'MESSAGE_MODULE_OPTIONS'
export const MESSAGE_EVENT = 'MESSAGE_EVENT'
