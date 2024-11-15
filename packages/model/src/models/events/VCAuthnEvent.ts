import { Expose } from 'class-transformer'
import { IsString } from 'class-validator'

import { Event } from './Event'
import { EventType } from './EventType'

export interface VCAuthnEventOptions {
  presentation_exchange_id: string
  state: string
  timestamp?: Date
  verified: string
  error_msg?: string
}

export class VCAuthnEvent extends Event {
  public constructor(options: VCAuthnEventOptions) {
    super()

    if (options) {
      this.presentation_exchange_id = options.presentation_exchange_id
      this.state = options.state
      this.timestamp = options.timestamp ?? new Date()
      this.verified = options.verified
      this.error_msg = options.error_msg
    }
  }

  public readonly type = VCAuthnEvent.type
  public static readonly type = EventType.VCAuthnEvent

  @Expose()
  @IsString()
  public presentation_exchange_id!: string

  @Expose()
  public verified?: string

  @Expose()
  @IsString()
  public state!: string

  @Expose()
  @IsString()
  public error_msg?: string
}
