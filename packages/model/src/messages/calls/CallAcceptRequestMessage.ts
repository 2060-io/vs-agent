import { Expose } from 'class-transformer'

import { BaseMessage, BaseMessageOptions } from '../BaseMessage'
import { MessageType } from '../MessageType'

export interface CallAcceptRequestMessageOptions extends BaseMessageOptions {
  parameters: Record<string, unknown>
}

export class CallAcceptRequestMessage extends BaseMessage {
  public constructor(options: CallAcceptRequestMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.parameters = options.parameters
    }
  }

  public readonly type = CallAcceptRequestMessage.type
  public static readonly type = MessageType.CallAcceptRequestMessage

  @Expose()
  public parameters!: Record<string, unknown>
}
