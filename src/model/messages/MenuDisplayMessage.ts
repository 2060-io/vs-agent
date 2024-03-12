import { Expose, Type } from 'class-transformer'
import { IsString, IsArray, IsInstance, IsOptional, ValidateNested } from 'class-validator'
import { BaseMessage, BaseMessageOptions } from './BaseMessage'

// TODO: define action types in protocol
type Action = string

export interface MenuItemOptions {
  id: string
  text: string
  action: Action
}

export class MenuItem {
  public constructor(options: MenuItemOptions) {
    if (options) {
      this.id = options.id
      this.text = options.text
      this.action = options.action
    }
  }

  @Expose()
  @IsString()
  public id!: string

  @Expose()
  @IsString()
  public text!: string

  @Expose()
  @IsOptional()
  public action?: Action
}

export interface MenuDisplayMessageOptions extends BaseMessageOptions {
  prompt: string
  menuItems: MenuItemOptions[]
}

export class MenuDisplayMessage extends BaseMessage {
  public constructor(options: MenuDisplayMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.prompt = options.prompt
      this.menuItems = options.menuItems.map((item) => new MenuItem(item))
    }
  }

  public readonly type = MenuDisplayMessage.type
  public static readonly type = 'menu-display'

  @Expose()
  @IsString()
  public prompt!: string

  @Expose()
  @Type(() => MenuItem)
  @IsArray()
  @ValidateNested()
  @IsInstance(MenuItem, { each: true })
  public menuItems!: MenuItem[]
}
