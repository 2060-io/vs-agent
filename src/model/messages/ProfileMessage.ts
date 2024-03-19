import { BaseMessage } from './BaseMessage'

export interface ProfileMessageOptions {
  id?: string
  connectionId: string
  displayName?: string | null
  displayImageUrl?: string | null
  displayIconUrl?: string | null
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
    }
  }

  public readonly type = ProfileMessage.type
  public static readonly type = 'profile'

  public displayName?: string | null
  public displayImageUrl?: string | null
  public displayIconUrl?: string | null
}
