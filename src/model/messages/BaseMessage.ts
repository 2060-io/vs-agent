import { JsonTransformer } from '@credo-ts/core'
import { Expose } from 'class-transformer'
import { v4 as uuid } from 'uuid'

export interface BaseMessageOptions {
  id?: string
  threadId?: string
  connectionId: string
  timestamp?: Date
}

export interface IBaseMessage {
  id?: string
  readonly type: string
  connectionId: string
  timestamp?: Date
  threadId?: string
}

export class BaseMessage implements IBaseMessage {
  public constructor() {}

  @Expose()
  public id!: string

  @Expose()
  public readonly type!: string

  @Expose()
  public connectionId!: string

  @Expose()
  public timestamp!: Date

  @Expose()
  public threadId?: string

  public generateId() {
    return uuid()
  }

  public toJSON() {
    return JsonTransformer.toJSON(this)
  }
}
