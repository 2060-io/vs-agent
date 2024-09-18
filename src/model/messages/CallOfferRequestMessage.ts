import { Expose, Type } from 'class-transformer'
import { IsString, IsArray, IsInstance, ValidateNested } from 'class-validator'

import { BaseMessage, BaseMessageOptions } from './BaseMessage'
import { MessageType } from './MessageType'

export interface CallOfferRequestMessageOptions extends BaseMessageOptions {
  requestedCallItem: RequestedCallItemOptions
}

export interface RequestedCallItemOptions {
  wsUrl: string
  roomId: string
  peerId: string
  iceserver: IceserverItemOptions[]
}

export interface IceserverItemOptions {
  urls: string
  username: string
  credential: string
}

export class IceserverItem {
  public constructor(options?: IceserverItemOptions) {
    if (options) {
      this.urls = options.urls
      this.username = options.username
      this.credential = options.credential
    }
  }

  @Expose()
  @IsString()
  public urls!: string

  @Expose()
  @IsString()
  public username!: string

  @Expose()
  @IsString()
  public credential!: string
}

export class RequestedCallItem {
  public constructor(options?: RequestedCallItemOptions) {
    if (options) {
      this.wsUrl = options.wsUrl
      this.roomId = options.roomId
      this.peerId = options.peerId
      this.iceserver = options.iceserver
    }
  }

  @Expose()
  @IsString()
  public wsUrl!: string

  @Expose()
  @IsString()
  public roomId!: string

  @Expose()
  @IsString()
  public peerId!: string

  @Expose()
  @Type(() => IceserverItem)
  @IsArray()
  @ValidateNested({ each: true })
  @IsInstance(IceserverItem, { each: true })
  public iceserver!: IceserverItem[]
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
