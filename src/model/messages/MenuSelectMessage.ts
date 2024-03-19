import { Expose, Type } from 'class-transformer'
import { IsArray, IsInstance, ValidateNested } from 'class-validator'

import { BaseMessage, BaseMessageOptions } from './BaseMessage'

export interface MenuSelectMessageOptions extends BaseMessageOptions {
  menuItems: MenuItemSelectionOptions[]
  threadId: string
}

export interface MenuItemSelectionOptions {
  id: string
}

export class MenuItemSelection {
  public constructor(options: MenuItemSelectionOptions) {
    this.id = options.id
  }

  @Expose()
  public id!: string
}

export class MenuSelectMessage extends BaseMessage {
  public constructor(options?: MenuSelectMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.menuItems = options.menuItems.map(item => new MenuItemSelection(item))
    }
  }

  public readonly type = MenuSelectMessage.type
  public static readonly type = 'menu-select'

  @Expose()
  @Type(() => MenuItemSelection)
  @IsArray()
  @ValidateNested()
  @IsInstance(MenuItemSelection, { each: true })
  menuItems!: MenuItemSelection[]
}
