import { DynamicModule, Type } from '@nestjs/common'

import { EventHandler } from '../interfaces'

export interface ConnectionsModuleOptions {
  eventHandler: Type<EventHandler>
  imports: DynamicModule[]
}

export const CONNECTIONS_EVENT = 'CONNECTIONS_EVENT'
