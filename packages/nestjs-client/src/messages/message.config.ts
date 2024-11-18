import { ApiVersion } from '@2060.io/service-agent-client'
import { Type } from '@nestjs/common'

import { MessageHandler } from '../interfaces'

export interface MessageModuleOptions {
  messageHandler?: MessageHandler | Type<MessageHandler>
  url: string
  version: ApiVersion
}

export const MESSAGE_MODULE_OPTIONS = 'MESSAGE_MODULE_OPTIONS'
export const MESSAGE_HANDLER = 'MESSAGE_HANDLER'
