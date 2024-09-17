import { Expose } from 'class-transformer'
import { IsString } from 'class-validator'

import { BaseMessage } from './BaseMessage'
import { MessageType } from './MessageType'

export interface TextMessageOptions {
  id?: string
  threadId?: string
  connectionId: string
  timestamp?: Date
  content: string
}

export class TextMessage extends BaseMessage {
  public constructor(options: TextMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.content = options.content
    }
  }

  public readonly type = TextMessage.type
  public static readonly type = MessageType.TextMessage

  @Expose()
  @IsString()
  public content!: string
}
