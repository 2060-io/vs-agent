import { BaseMessage, BaseMessageOptions } from '../BaseMessage'
import { MessageType } from '../MessageType'

export class EMrtdDataRequestMessage extends BaseMessage {
  public constructor(options: BaseMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
    }
  }

  public readonly type = EMrtdDataRequestMessage.type
  public static readonly type = MessageType.EMrtdDataRequestMessage
}
