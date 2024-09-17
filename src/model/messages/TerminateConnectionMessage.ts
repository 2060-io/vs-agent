import { BaseMessage, BaseMessageOptions } from './BaseMessage'
import { MessageType } from './MessageType'

export interface TerminateConnectionMessageOptions extends BaseMessageOptions {}

export class TerminateConnectionMessage extends BaseMessage {
  public constructor(options: TerminateConnectionMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
    }
  }

  public readonly type = TerminateConnectionMessage.type
  public static readonly type = MessageType.TerminateConnectionMessage
}
