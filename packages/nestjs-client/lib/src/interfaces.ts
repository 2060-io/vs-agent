import { BaseMessage } from '@2060.io/model'

export interface MessageHandler {
  inputMessage(message: BaseMessage): Promise<void> | void
}
