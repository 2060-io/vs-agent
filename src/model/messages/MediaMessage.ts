import { utils } from '@credo-ts/core'
import { Type } from 'class-transformer'
import { IsOptional, IsArray, IsInstance, IsString, ValidateNested } from 'class-validator'

import { BaseMessage } from './BaseMessage'

export interface CipheringInfo {
  algorithm: string
  // Other fields are dependant on the algorithm chosen
  parameters?: Record<string, unknown>
}

export interface MediaItemOptions {
  id?: string
  description?: string
  mimeType: string
  filename?: string
  byteCount?: number
  uri: string
  ciphering?: CipheringInfo
  preview?: string
  duration?: string
  title?: string
  icon?: string
  openingMode?: string
}

export class MediaItem {
  public constructor(options: MediaItemOptions) {
    if (options) {
      this.id = options.id ?? utils.uuid()
      this.description = options.description
      this.mimeType = options.mimeType
      this.filename = options.filename
      this.byteCount = options.byteCount
      this.uri = options.uri
      this.ciphering = options.ciphering
      this.preview = options.preview
      this.duration = options.duration
      this.title = options.title
      this.icon = options.icon
      this.openingMode = options.openingMode
    }
  }

  @IsOptional()
  @IsString()
  public id?: string

  @IsOptional()
  @IsString()
  public description?: string

  @IsString()
  public uri!: string

  @IsString()
  public mimeType!: string

  @IsOptional()
  public byteCount?: number

  @IsOptional()
  @IsString()
  public filename?: string

  @IsOptional()
  @IsString()
  public preview?: string

  @IsOptional()
  @IsString()
  public duration?: string

  @IsOptional()
  @IsString()
  public title?: string

  @IsOptional()
  @IsString()
  public icon?: string

  @IsOptional()
  @IsString()
  public openingMode?: string

  @IsOptional()
  public ciphering?: CipheringInfo
}

export interface MediaMessageOptions {
  id?: string
  threadId?: string
  connectionId: string
  description?: string
  timestamp?: Date
  items: MediaItem[]
}

export class MediaMessage extends BaseMessage {
  public constructor(options: MediaMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.description = options.description
      this.items = options.items
    }
  }

  public readonly type = MediaMessage.type
  public static readonly type = 'media'

  @IsOptional()
  @IsString()
  public description?: string

  @Type(() => MediaItem)
  @IsArray()
  @ValidateNested()
  @IsInstance(MediaItem, { each: true })
  public items!: MediaItem[]
}
