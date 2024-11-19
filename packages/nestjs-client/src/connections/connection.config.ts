import { Type } from '@nestjs/common'

import { EventHandler } from '../interfaces'

export interface ConnectionsModuleOptions {
  eventHandler?: EventHandler | Type<EventHandler>
  useTypeOrm?: boolean
}

export const CONNECTIONS_MODULE_OPTIONS = 'CONNECTIONS_MODULE_OPTIONS'
export const CONNECTIONS_REPOSITORY = 'CONNECTIONS_REPOSITORY'
