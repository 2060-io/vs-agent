import { MessageReceipt, MessageState } from 'credo-ts-receipts'
import { Expose, Type, Transform } from 'class-transformer'
import { IsInstance, IsArray, IsDate, IsString, ValidateNested } from 'class-validator'
import { BaseMessage } from './BaseMessage'
import { DateParser } from '@credo-ts/core/build/utils/transformers'

// FIXME: Do a better conversion between DIDComm protocol and Service Agent protocol constants
const didcommMessageState: Record<string, MessageState> = {
  'created' : MessageState.Created,
  'deleted' : MessageState.Deleted,
  'received' : MessageState.Received,
  'submitted' : MessageState.Submitted,
  'viewed' : MessageState.Viewed
}

export interface ServiceAgentMessageReceiptOptions {
  messageId: string
  state: string
  timestamp?: Date
}

export class ServiceAgentMessageReceipt {
  public constructor(options: ServiceAgentMessageReceiptOptions) {
    if (options) {
      this.messageId = options.messageId
      this.state = options.state
      this.timestamp = options.timestamp ?? new Date()
    }
  }

  @Expose({ name: 'message_id' })
  @IsString()
  public messageId!: string

  @IsString()
  public state!: string

  @IsDate()
  @Transform(({ value }) => DateParser(value))
  public timestamp!: Date
}

export interface ReceiptsMessageOptions {
  id?: string
  threadId?: string
  connectionId: string
  timestamp?: Date
  receipts: ServiceAgentMessageReceiptOptions[]
}

export const didcommReceiptFromServiceAgentReceipt = 
  (receipt: ServiceAgentMessageReceipt) => new MessageReceipt({ ...receipt, state: didcommMessageState[receipt.state.toLowerCase()]})

export class ReceiptsMessage extends BaseMessage {
  public constructor(options: ReceiptsMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.receipts = options.receipts.map((receipt) => new MessageReceipt({ ...receipt, state: didcommMessageState[receipt.state.toLowerCase()]}))
    }
  }

  public readonly type = ReceiptsMessage.type
  public static readonly type = 'receipts'

  @Expose()
  @Type(() => ServiceAgentMessageReceipt)
  @IsArray()
  @ValidateNested()
  @IsInstance(ServiceAgentMessageReceipt, { each: true })
  public receipts!: ServiceAgentMessageReceipt[]
}
