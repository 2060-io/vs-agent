import { Expose, Type } from 'class-transformer'
import { IsString, IsArray, IsInstance, ValidateNested } from 'class-validator'

import { BaseMessage, BaseMessageOptions } from './BaseMessage'

export interface ProofItemResultOptions {
  id: string
  type: string
}

export class ProofItemResult {
  public constructor(options?: ProofItemResultOptions) {
    if (options) {
      this.id = options.id
      this.type = options.type
    }
  }

  @Expose()
  @IsString()
  public id!: string

  @Expose()
  @IsString()
  public readonly type!: string
}

export interface IdentityProofResultMessageOptions extends BaseMessageOptions {
  proofItemResults: ProofItemResultOptions[]
}

export class IdentityProofResultMessage extends BaseMessage {
  public constructor(options?: IdentityProofResultMessage) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.proofItemResults = options.proofItemResults
    }
  }

  public readonly type = IdentityProofResultMessage.type
  public static readonly type = 'identity-proof-result'

  @Expose()
  @Type(() => ProofItemResult)
  @IsArray()
  @ValidateNested()
  @IsInstance(ProofItemResult, { each: true })
  public proofItemResults!: ProofItemResult[]
}
