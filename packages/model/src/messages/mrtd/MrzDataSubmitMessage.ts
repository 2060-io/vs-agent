import { MrzData } from '@2060.io/credo-ts-didcomm-mrtd'

import { BaseMessage, BaseMessageOptions } from '../BaseMessage'
import { MessageType } from '../MessageType'

import { MrtdSubmitState } from './MrtdSubmitState'

export interface MrzDataSubmitMessageOptions extends BaseMessageOptions {
  state: MrtdSubmitState
  mrzData?: MrzData
}

export class MrzDataSubmitMessage extends BaseMessage {
  public constructor(options: MrzDataSubmitMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
      this.mrzData = options.mrzData
    }
  }

  public readonly type = MrzDataSubmitMessage.type
  public static readonly type = MessageType.MrzDataSubmitMessage

  public mrzData?: MrzData

  public state!: MrtdSubmitState
}
