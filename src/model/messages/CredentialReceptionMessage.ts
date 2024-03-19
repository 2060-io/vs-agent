import { CredentialState } from '@credo-ts/core'
import { Expose } from 'class-transformer'
import { IsString } from 'class-validator'

import { BaseMessage, BaseMessageOptions } from './BaseMessage'

export interface CredentialReceptionMessageOptions extends BaseMessageOptions {
  state: CredentialState
}

export class CredentialReceptionMessage extends BaseMessage {
  public constructor(options: CredentialReceptionMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.state = options.state
    }
  }

  public readonly type = CredentialReceptionMessage.type
  public static readonly type = 'credential-reception'

  @Expose()
  @IsString()
  public state!: CredentialState
}
