import { Expose } from 'class-transformer'
import { IsString } from 'class-validator'
import { MessageState } from 'credo-ts-receipts'

import { Event } from './Event'
import { EventType } from './EventType'

export interface MessageStateUpdatedOptions {
  connectionId: string
  state: MessageState
  timestamp?: Date
  messageId: string
}

export class MessageStateUpdated extends Event {
  public constructor(options: MessageStateUpdatedOptions) {
    super()

    if (options) {
      this.connectionId = options.connectionId
      this.state = options.state
      this.timestamp = options.timestamp ?? new Date()
      this.messageId = options.messageId
    }
  }

  public readonly type = MessageStateUpdated.type
  public static readonly type = EventType.MessageStateUpdated

  @Expose()
  @IsString()
  public connectionId!: string

  @Expose()
  @IsString()
  public messageId!: string

  @Expose()
  @IsString()
  public state!: MessageState
}
