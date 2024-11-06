import { Expose } from 'class-transformer'

import { BaseMessage, BaseMessageOptions } from '../BaseMessage'
import { MessageType } from '../MessageType'

export interface CallOfferRequestMessageOptions extends BaseMessageOptions {
  parameters: Record<string, unknown>
}

export class CallOfferRequestMessage extends BaseMessage {
  public constructor(options: CallOfferRequestMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.parameters = options.parameters
    }
  }

  public readonly type = CallOfferRequestMessage.type
  public static readonly type = MessageType.CallOfferRequestMessage

  @Expose()
  public parameters!: Record<string, unknown>
}
