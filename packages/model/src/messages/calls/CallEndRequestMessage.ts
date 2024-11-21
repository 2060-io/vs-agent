import { BaseMessage, BaseMessageOptions } from '../BaseMessage'
import { MessageType } from '../MessageType'

export interface CallEndRequestMessageOptions extends BaseMessageOptions {}

export class CallEndRequestMessage extends BaseMessage {
  public constructor(options?: CallEndRequestMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
    }
  }

  public readonly type = CallEndRequestMessage.type
  public static readonly type = MessageType.CallEndRequestMessage
}
