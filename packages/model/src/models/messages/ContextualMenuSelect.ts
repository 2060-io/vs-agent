import { Expose } from 'class-transformer'
import { IsString, IsOptional } from 'class-validator'

import { BaseMessage, BaseMessageOptions } from './BaseMessage'
import { MessageType } from './MessageType'

export interface ContextualMenuSelectMessageOptions extends BaseMessageOptions {
  selectionId?: string
}

export class ContextualMenuSelectMessage extends BaseMessage {
  public constructor(options: ContextualMenuSelectMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.selectionId = options.selectionId
    }
  }

  public readonly type = ContextualMenuSelectMessage.type
  public static readonly type = MessageType.ContextualMenuSelectMessage

  @Expose()
  @IsString()
  @IsOptional()
  public selectionId?: string
}
