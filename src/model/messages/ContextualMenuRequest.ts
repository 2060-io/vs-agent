import { BaseMessage, BaseMessageOptions } from './BaseMessage'
import { MessageType } from './MessageType'

export interface ContextualMenuRequestMessageOptions extends BaseMessageOptions {}

export class ContextualMenuRequestMessage extends BaseMessage {
  public constructor(options: ContextualMenuRequestMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
    }
  }

  public readonly type = ContextualMenuRequestMessage.type
  public static readonly type = MessageType.ContextualMenuRequestMessage
}
