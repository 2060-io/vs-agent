import { DidExchangeState } from '@credo-ts/core'
import { Expose } from 'class-transformer'
import { IsString } from 'class-validator'

import { Event } from './Event'
import { EventType } from './EventType'

export const ExtendedDidExchangeState = {
  ...DidExchangeState,
  Terminated: 'terminated',
} as const

export type ExtendedDidExchangeState =
  (typeof ExtendedDidExchangeState)[keyof typeof ExtendedDidExchangeState]

export interface ConnectionStateUpdatedOptions {
  connectionId: string
  state: ExtendedDidExchangeState
  timestamp?: Date
  invitationId?: string
}

export class ConnectionStateUpdated extends Event {
  public constructor(options: ConnectionStateUpdatedOptions) {
    super()

    if (options) {
      this.connectionId = options.connectionId
      this.state = options.state
      this.timestamp = options.timestamp ?? new Date()
      this.invitationId = options.invitationId
    }
  }

  public readonly type = ConnectionStateUpdated.type
  public static readonly type = EventType.ConnectionState

  @Expose()
  @IsString()
  public connectionId!: string

  @Expose()
  @IsString()
  public invitationId?: string

  @Expose()
  @IsString()
  public state!: ExtendedDidExchangeState
}
