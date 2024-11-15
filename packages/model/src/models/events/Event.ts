import { Expose } from 'class-transformer'
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'

import { EventType } from './EventType'

export class Event {
  public constructor() {}

  @Expose()
  @IsEnum(EventType)
  public readonly type!: EventType

  @Expose()
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  public timestamp!: Date
}
