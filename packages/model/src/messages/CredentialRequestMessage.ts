import { Expose, Type } from 'class-transformer'
import { IsOptional, IsString, IsArray, IsInstance, ValidateNested, IsNumber } from 'class-validator'

import { BaseMessage, BaseMessageOptions } from './BaseMessage'
import { Claim, ClaimOptions } from './CredentialIssuanceMessage'
import { MessageType } from './MessageType'

export interface CredentialRequestMessageOptions extends BaseMessageOptions {
  credentialDefinitionId: string
  revocationDefinitionId?: string
  revocationRegistryIndex?: number
  claims: ClaimOptions[]
}

export class CredentialRequestMessage extends BaseMessage {
  public constructor(options: CredentialRequestMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.credentialDefinitionId = options.credentialDefinitionId
      this.revocationDefinitionId = options.revocationDefinitionId
      this.revocationRegistryIndex = options.revocationRegistryIndex
      this.claims = options.claims.map(item => new Claim(item))
    }
  }

  public readonly type = CredentialRequestMessage.type
  public static readonly type = MessageType.CredentialRequestMessage

  @Expose()
  @IsString()
  public credentialDefinitionId!: string
  
  @Expose()
  @IsString()
  @IsOptional()
  public revocationDefinitionId?: string

  @Expose()
  @IsNumber()
  @IsOptional()
  public revocationRegistryIndex?: number

  @Expose()
  @Type(() => Claim)
  @IsArray()
  @ValidateNested()
  @IsInstance(Claim, { each: true })
  @IsOptional()
  public claims?: Claim[]
}
