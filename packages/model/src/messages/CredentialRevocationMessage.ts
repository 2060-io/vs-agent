import { BaseMessage, BaseMessageOptions } from './BaseMessage'
import { MessageType } from './MessageType'

export interface CredentialRevocationMessageOptions extends BaseMessageOptions {}

export class CredentialRevocationMessage extends BaseMessage {
  public constructor(options: CredentialRevocationMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.threadId = options.threadId
      this.timestamp = options.timestamp ?? new Date()
      this.connectionId = options.connectionId
    }
  }

  public readonly type = CredentialRevocationMessage.type
  public static readonly type = MessageType.CredentialRevocationMessage
}
