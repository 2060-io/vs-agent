import { JsonTransformer } from '@credo-ts/core'
import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEnum, IsUUID, IsOptional, IsString, IsNotEmpty } from 'class-validator'
import { v4 as uuid } from 'uuid'

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
  @ApiProperty({
    description: 'Optional unique identifier',
    example: '73e93a8b-e67a-437b-971f-c6c958d14546',
  })
  @IsUUID()
  @IsOptional()
  public id!: string

  @Expose()
  @ApiProperty({
    description: 'Message type',
    example: 'text',
  })
  @IsEnum(MessageType)
  public readonly type!: MessageType

  @Expose()
  @ApiProperty({
    description: 'Connection identifier',
    example: '73e93a8b-e67a-437b-971f-c6c958d14546',
  })
  public connectionId!: string

  @Expose()
  @ApiProperty({
    description: 'Optional timestamp',
    example: '2024-03-11T14:03:50.607Z',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  public timestamp!: Date

  @Expose()
  @ApiProperty({
    description: 'Thread identifier (if the message comes as a response from another flow)',
    example: '73e93a8b-e67a-437b-971f-c6c958d14546',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  public threadId?: string

  public generateId() {
    return uuid()
  }

  public toJSON() {
    return JsonTransformer.toJSON(this)
  }
}
