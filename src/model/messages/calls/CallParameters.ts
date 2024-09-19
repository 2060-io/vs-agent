import { Expose, Type } from 'class-transformer'
import { IsString, IsArray, IsInstance, ValidateNested } from 'class-validator'

export interface RequestedCallItemOptions {
  wsUrl: string
  iceserver: IceserverItemOptions[]
}

export interface IceserverItemOptions {
  urls: string
  username: string
  credential: string
}

export class IceserverItem {
  public constructor(options?: IceserverItemOptions) {
    if (options) {
      this.urls = options.urls
      this.username = options.username
      this.credential = options.credential
    }
  }

  @Expose()
  @IsString()
  public urls!: string

  @Expose()
  @IsString()
  public username!: string

  @Expose()
  @IsString()
  public credential!: string
}

export class RequestedCallItem {
  public constructor(options?: RequestedCallItemOptions) {
    if (options) {
      this.wsUrl = options.wsUrl
      this.iceserver = options.iceserver
    }
  }

  @Expose()
  @IsString()
  public wsUrl!: string

  @Expose()
  @Type(() => IceserverItem)
  @IsArray()
  @ValidateNested({ each: true })
  @IsInstance(IceserverItem, { each: true })
  public iceserver!: IceserverItem[]
}
