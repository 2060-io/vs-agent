import { BaseMessage, BaseMessageOptions } from '../BaseMessage'
import { MessageType } from '../MessageType'

export interface CallRejectRequestMessageOptions extends BaseMessageOptions {}

export class CallRejectRequestMessage extends BaseMessage {
  public constructor(options?: CallRejectRequestMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
    }
  }

  public readonly type = CallRejectRequestMessage.type
  public static readonly type = MessageType.CallRejectRequestMessage
}
