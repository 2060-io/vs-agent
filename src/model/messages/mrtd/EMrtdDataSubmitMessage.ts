import { EMrtdData } from '@2060.io/credo-ts-didcomm-mrtd'
import { Expose } from 'class-transformer'

import { BaseMessage, BaseMessageOptions } from '../BaseMessage'
import { MessageType } from '../MessageType'

export interface EMrtdDataSubmitMessageOptions extends BaseMessageOptions {
  dataGroups: EMrtdData
}

export class EMrtdDataSubmitMessage extends BaseMessage {
  public constructor(options: EMrtdDataSubmitMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.dataGroups = options.dataGroups
    }
  }

  public readonly type = EMrtdDataSubmitMessage.type
  public static readonly type = MessageType.EMrtdDataSubmitMessage

  @Expose()
  public dataGroups!: EMrtdData
}
