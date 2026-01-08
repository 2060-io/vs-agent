import { Expose, Transform } from 'class-transformer'
import { IsOptional, IsString } from 'class-validator'

import { BaseMessage, BaseMessageOptions } from '../BaseMessage'
import { MessageType } from '../MessageType'
import { DateParser } from '../../utils'

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
      this.description = options.description
      this.parameters = options.parameters
    }
  }

  public readonly type = CallOfferRequestMessage.type
  public static readonly type = MessageType.CallOfferRequestMessage

  @IsOptional()
  @Transform(({ value }) => (value ? DateParser(value) : undefined))
  public offerExpirationTime?: Date

  @IsOptional()
  @Transform(({ value }) => (value ? DateParser(value) : undefined))
  public offerStartTime?: Date

  @Expose()
  @IsString()
  @IsOptional()
  public description?: string

  @Expose()
  public parameters!: Record<string, unknown>
}
