import 'reflect-metadata'

import { Expose, Type } from 'class-transformer'
import { IsOptional, IsString, IsArray, IsInstance, ValidateNested, IsNumber } from 'class-validator'

import { BaseMessage, BaseMessageOptions } from './BaseMessage'
import { MessageType } from './MessageType'

export interface ClaimOptions {
  name: string
  mimeType?: string
  value: string
}

export class Claim {
  public constructor(options: ClaimOptions) {
    if (options) {
      this.name = options.name
      this.mimeType = options.mimeType
      this.value = options.value
    }
  }

  @Expose()
  @IsString()
  public name!: string

  @Expose()
  @IsString()
  @IsOptional()
  public mimeType?: string

  @Expose()
  @IsString()
  public value!: string
}

export interface CredentialIssuanceMessageOptions extends BaseMessageOptions {
  credentialDefinitionId: string
  revocationDefinitionId?: string
  revocationRegistryIndex?: number
  claims?: Claim[]
}

export class CredentialIssuanceMessage extends BaseMessage {
  public constructor(options: CredentialIssuanceMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.credentialDefinitionId = options.credentialDefinitionId
      this.revocationDefinitionId = options.revocationDefinitionId
      this.revocationRegistryIndex = options.revocationRegistryIndex
      this.claims = options.claims?.map(item => new Claim(item))
    }
  }

  public readonly type = CredentialIssuanceMessage.type
  public static readonly type = MessageType.CredentialIssuanceMessage

  @Expose()
  @IsString()
  public credentialDefinitionId?: string
  
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
