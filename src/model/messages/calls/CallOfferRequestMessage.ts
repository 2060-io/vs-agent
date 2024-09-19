import { Expose, Type } from 'class-transformer'
import { IsInstance, ValidateNested } from 'class-validator'

import { BaseMessage, BaseMessageOptions } from '../BaseMessage'
import { MessageType } from '../MessageType'

import { RequestedCallItem, RequestedCallItemOptions } from './CallParameters'

export interface CallOfferRequestMessageOptions extends BaseMessageOptions {
  requestedCallItem: RequestedCallItemOptions
}

export class CallOfferRequestMessage extends BaseMessage {
  public constructor(options: CallOfferRequestMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.requestedCallItem = new RequestedCallItem(options.requestedCallItem)
    }
  }

  public readonly type = CallOfferRequestMessage.type
  public static readonly type = MessageType.CallOfferRequestMessage

  @Expose()
  @Type(() => RequestedCallItem)
  @ValidateNested()
  @IsInstance(RequestedCallItem)
  public requestedCallItem!: RequestedCallItem
}
