import { BaseMessage, ConnectionStateUpdated } from '@2060.io/model'

export interface EventHandler {
  newConnection(event: ConnectionStateUpdated): Promise<void> | void
  inputMessage(message: BaseMessage): Promise<void> | void
}

export const EVENT_HANDLER = 'EVENT_HANDLER'
