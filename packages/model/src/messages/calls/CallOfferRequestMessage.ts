import { Expose, Transform } from 'class-transformer'

import { BaseMessage, BaseMessageOptions } from '../BaseMessage'
import { MessageType } from '../MessageType'
import { IsString } from 'class-validator'
import { DateParser } from '@credo-ts/core/build/utils/transformers'

export interface CallOfferRequestMessageOptions extends BaseMessageOptions {
  offerExpirationTime?: Date
  offerStartTime?: Date
  description?: string
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
      this.offerExpirationTime = options.offerExpirationTime
      this.offerStartTime = options.offerStartTime
      this.description = options.description ?? 'Call Offer'
      this.parameters = options.parameters
    }
  }

  public readonly type = CallOfferRequestMessage.type
  public static readonly type = MessageType.CallOfferRequestMessage

  @Expose()
  @Transform(({ value }) => DateParser(value))
  public offerExpirationTime?: Date

  @Expose()
  @Transform(({ value }) => DateParser(value))
  public offerStartTime?: Date

  @Expose()
  @IsString()
  public description!: string

  @Expose()
  public parameters!: Record<string, unknown>
}
