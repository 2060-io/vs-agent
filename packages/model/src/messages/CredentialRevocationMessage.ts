import { Expose } from 'class-transformer'
import { IsString, IsNumber } from 'class-validator'

import { BaseMessage, BaseMessageOptions } from './BaseMessage'
import { MessageType } from './MessageType'

export interface CredentialRevocationMessageOptions extends BaseMessageOptions {
  credentialDefinitionId: string
  revocationDefinitionId: string
  revocationRegistryIndex: number
}

export class CredentialRevocationMessage extends BaseMessage {
  public constructor(options: CredentialRevocationMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.credentialDefinitionId = options.credentialDefinitionId
      this.revocationDefinitionId = options.revocationDefinitionId
      this.revocationRegistryIndex = options.revocationRegistryIndex
    }
  }

  public readonly type = CredentialRevocationMessage.type
  public static readonly type = MessageType.CredentialRevocationMessage

  @Expose()
  @IsString()
  public credentialDefinitionId!: string

  @Expose()
  @IsString()
  public revocationDefinitionId!: string

  @Expose()
  @IsNumber()
  public revocationRegistryIndex!: number
}
