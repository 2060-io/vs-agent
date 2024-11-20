import { EventHandler } from '@2060.io/service-agent-client'
import { DynamicModule, Type } from '@nestjs/common'

export interface ConnectionsModuleOptions {
  eventHandler: Type<EventHandler>
  imports: DynamicModule[]
}

export const CONNECTIONS_EVENT = 'CONNECTIONS_EVENT'
