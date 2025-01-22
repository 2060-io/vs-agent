import { IsNumber, IsString, IsArray, IsDate, IsOptional } from 'class-validator'

export class StatEnum {
  @IsNumber()
  index: number

  @IsString()
  @IsOptional()
  value?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  label?: string

  constructor(index: number, value: string) {
    this.index = index
    this.value = value
  }
}

export class StatEvent {
  @IsString()
  statClass: string

  @IsString()
  entityId: string

  @IsArray()
  enums: StatEnum[]

  @IsDate()
  ts: Date

  @IsNumber()
  increment: number = 1

  constructor(
    entityId: string,
    enums: StatEnum[],
    increment: number,
    ts: Date = new Date(),
    statClass: string,
  ) {
    this.entityId = entityId
    this.enums = enums
    this.increment = increment
    this.ts = ts
    this.statClass = statClass
  }

  toJSON(): Record<string, any> {
    return {
      statClass: this.statClass,
      entityId: this.entityId,
      enums: this.enums.map(statEnum => ({
        index: statEnum.index,
        description: statEnum.value,
      })),
      ts: this.ts.toISOString(),
      increment: this.increment,
    }
  }
}
