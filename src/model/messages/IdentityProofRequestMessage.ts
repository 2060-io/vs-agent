import { Expose, Type } from 'class-transformer'
import { BaseMessage, BaseMessageOptions } from './BaseMessage'
import { IsString, IsArray, IsInstance, ValidateNested } from 'class-validator'


export interface RequestedProofItemOptions {
  id: string
  type: string
}

export class RequestedProofItem {
  public constructor(options?: RequestedProofItemOptions) {
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

export interface IdentityProofRequestMessageOptions extends BaseMessageOptions {
  requestedProofItems: RequestedProofItemOptions[]
}

export class IdentityProofRequestMessage extends BaseMessage {
  public constructor(options: IdentityProofRequestMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.requestedProofItems = options.requestedProofItems.map(item => new RequestedProofItem(item))
    }
  }

  public readonly type = IdentityProofRequestMessage.type
  public static readonly type = 'identity-proof-request'

  @Expose()
  @Type(() => RequestedProofItem)
  @IsArray()
  @ValidateNested()
  @IsInstance(RequestedProofItem, { each: true })
  public requestedProofItems!: RequestedProofItem[]}
