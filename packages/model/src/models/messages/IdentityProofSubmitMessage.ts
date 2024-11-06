import { Expose, Type } from 'class-transformer'
import { IsString, IsArray, IsInstance, ValidateNested } from 'class-validator'

import { BaseMessage, BaseMessageOptions } from './BaseMessage'
import { MessageType } from './MessageType'

export interface SubmittedProofItemOptions {
  id: string
  type: string
}

export class SubmittedProofItem {
  public constructor(options?: SubmittedProofItemOptions) {
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

export interface IdentityProofSubmitMessageOptions extends BaseMessageOptions {
  submittedProofItems: SubmittedProofItem[]
}

export class IdentityProofSubmitMessage extends BaseMessage {
  public constructor(options?: IdentityProofSubmitMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.submittedProofItems = options.submittedProofItems
    }
  }

  public readonly type = IdentityProofSubmitMessage.type
  public static readonly type = MessageType.IdentityProofSubmitMessage

  @Expose()
  @Type(() => SubmittedProofItem)
  @IsArray()
  @ValidateNested()
  @IsInstance(SubmittedProofItem, { each: true })
  public submittedProofItems!: SubmittedProofItem[]
}
