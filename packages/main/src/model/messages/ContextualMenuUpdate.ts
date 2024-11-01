import { Expose, Type } from 'class-transformer'
import { IsString, IsArray, IsInstance, IsOptional, ValidateNested } from 'class-validator'

import { BaseMessage, BaseMessageOptions } from './BaseMessage'
import { MessageType } from './MessageType'

export interface ContextualMenuItemOptions {
  id: string
  title: string
  description?: string
}

export class ContextualMenuItem {
  public constructor(options: ContextualMenuItemOptions) {
    if (options) {
      this.id = options.id
      this.title = options.title
      this.description = options.description
    }
  }

  @Expose()
  @IsString()
  public id!: string

  @Expose()
  @IsString()
  public title!: string

  @Expose()
  @IsOptional()
  public description?: string
}

export interface ContextualMenuUpdateMessageOptions extends BaseMessageOptions {
  title: string
  description?: string
  options: ContextualMenuItemOptions[]
}

export class ContextualMenuUpdateMessage extends BaseMessage {
  public constructor(options: ContextualMenuUpdateMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.title = options.title
      this.description = options.description
      this.options = options.options.map(item => new ContextualMenuItem(item))
    }
  }

  public readonly type = ContextualMenuUpdateMessage.type
  public static readonly type = MessageType.ContextualMenuUpdateMessage

  @Expose()
  @IsString()
  public title!: string

  @Expose()
  @IsString()
  @IsOptional()
  public description?: string

  @Expose()
  @Type(() => ContextualMenuItem)
  @IsArray()
  @ValidateNested()
  @IsInstance(ContextualMenuItem, { each: true })
  public options!: ContextualMenuItem[]
}
