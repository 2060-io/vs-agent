import { ConnectionRecord, utils } from '@credo-ts/core'
import { Injectable, Logger } from '@nestjs/common'
import { IBaseMessage } from '@verana-labs/vs-agent-model'

import { MessageService } from '../MessageService'

@Injectable()
export class CoreMessageService {
  private readonly logger = new Logger(CoreMessageService.name)
  constructor(private readonly messageService: MessageService) {}

  async processMessage(message: IBaseMessage, connection: ConnectionRecord): Promise<{ id: string }> {
    this.logger.log(`Sending message directly: ${message.id}`)
    await this.messageService.sendMessage(message, connection)
    return { id: message.id ?? utils.uuid() }
  }
}
