import { BaseMessage, BaseMessageOptions } from '../BaseMessage'
import { MessageType } from '../MessageType'

export class MrzDataRequestMessage extends BaseMessage {
  public constructor(options: BaseMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
    }
  }

  public readonly type = MrzDataRequestMessage.type
  public static readonly type = MessageType.MrzDataRequestMessage
}
