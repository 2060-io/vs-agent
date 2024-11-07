import { JsonTransformer, utils } from '@credo-ts/core'
import { Expose } from 'class-transformer'
import { IsEnum, IsUUID, IsOptional, IsString, IsNotEmpty } from 'class-validator'

import { MessageType } from './MessageType'

export interface BaseMessageOptions {
  id?: string
  threadId?: string
  connectionId: string
  timestamp?: Date
}

export interface IBaseMessage {
  id?: string
  readonly type: MessageType
  connectionId: string
  timestamp?: Date
  threadId?: string
}

export class BaseMessage implements IBaseMessage {
  public constructor() {}

  @Expose()
  @IsUUID()
  @IsOptional()
  public id!: string

  @Expose()
  @IsEnum(MessageType)
  public readonly type!: MessageType

  @Expose()
  public connectionId!: string

  @Expose()
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  public timestamp!: Date

  @Expose()
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  public threadId?: string

  public generateId() {
    return utils.uuid()
  }

  public toJSON() {
    return JsonTransformer.toJSON(this)
  }
}
