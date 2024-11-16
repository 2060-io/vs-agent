import { Type } from '@nestjs/common'

import { MessageHandler } from '../interfaces'

export interface MessageModuleOptions {
  messageHandler?: MessageHandler | Type<MessageHandler>
}

export const MESSAGE_MODULE_OPTIONS = 'MESSAGE_MODULE_OPTIONS'
export const MESSAGE_HANDLER = 'MESSAGE_HANDLER'
