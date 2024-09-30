import { BaseMessage } from './BaseMessage'
import { MessageType } from './MessageType'

export interface ProfileMessageOptions {
  id?: string
  connectionId: string
  displayName?: string | null
  displayImageUrl?: string | null
  displayIconUrl?: string | null
  preferredLanguage?: string | null
}

export class ProfileMessage extends BaseMessage {
  public constructor(options: ProfileMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.connectionId = options.connectionId
      this.displayName = options.displayName
      this.displayImageUrl = options.displayImageUrl
      this.displayIconUrl = options.displayIconUrl
      this.preferredLanguage = options.preferredLanguage
    }
  }

  public readonly type = ProfileMessage.type
  public static readonly type = MessageType.ProfileMessage

  public displayName?: string | null
  public displayImageUrl?: string | null
  public displayIconUrl?: string | null
  public preferredLanguage?: string | null
}
