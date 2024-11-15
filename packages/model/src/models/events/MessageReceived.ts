import { Expose } from 'class-transformer'

import { BaseMessage } from '../messages'

import { Event } from './Event'
import { EventType } from './EventType'

export interface MessageReceivedOptions {
  timestamp?: Date
  message: BaseMessage
}

export class MessageReceived extends Event {
  public constructor(options: MessageReceivedOptions) {
    super()

    if (options) {
      this.timestamp = options.timestamp ?? new Date()
      this.message = options.message
    }
  }

  public readonly type = MessageReceived.type
  public static readonly type = EventType.MessageReceived

  @Expose()
  public message!: BaseMessage
}
