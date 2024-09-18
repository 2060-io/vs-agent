import { Expose, Type } from 'class-transformer'
import { IsString, IsArray, IsInstance, ValidateNested } from 'class-validator'

import { BaseMessage, BaseMessageOptions } from './BaseMessage'
import { MessageType } from './MessageType'

export interface SubmittedItemsOptions {
  id: string
  type: string
}

export class SubmittedItems {
  public constructor(options?: SubmittedItemsOptions) {
    if (options) {
      this.id = options.id
      this.type = options.type
    }
  }

  @Expose()
  @IsString()
  public id!: string

  @Expose()
  @IsString()
  public readonly type!: string
}

export interface CallOfferSubmitMessageOptions extends BaseMessageOptions {
  submittedItems: SubmittedItems[]
}

export class CallOfferSubmitMessage extends BaseMessage {
  public constructor(options?: CallOfferSubmitMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.submittedItems = options.submittedItems
    }
  }

  public readonly type = CallOfferSubmitMessage.type
  public static readonly type = MessageType.CallOfferSubmitMessage

  @Expose()
  @Type(() => SubmittedItems)
  @IsArray()
  @ValidateNested()
  @IsInstance(SubmittedItems, { each: true })
  public submittedItems!: SubmittedItems[]
}
