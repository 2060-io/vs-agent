import { ApiVersion } from '@2060.io/service-agent-client'
import { Type } from '@nestjs/common'

import { EventHandler } from '../interfaces'

export interface MessageModuleOptions {
  eventHandler?: EventHandler | Type<EventHandler>
  url: string
  version: ApiVersion
}

export const MESSAGE_MODULE_OPTIONS = 'MESSAGE_MODULE_OPTIONS'
