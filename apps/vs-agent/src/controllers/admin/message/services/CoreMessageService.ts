import { IBaseMessage } from '@2060.io/vs-agent-model'
import { utils } from '@credo-ts/core'
import { DidCommConnectionRecord } from '@credo-ts/didcomm'
import { Injectable, Logger } from '@nestjs/common'

import { MessageService } from '../MessageService'

@Injectable()
export class CoreMessageService {
  private readonly logger = new Logger(CoreMessageService.name)
  constructor(private readonly messageService: MessageService) {}

  async processMessage(message: IBaseMessage, connection: DidCommConnectionRecord): Promise<{ id: string }> {
    this.logger.log(`Sending message directly: ${message.id}`)
    await this.messageService.sendMessage(message, connection)
    return { id: message.id ?? utils.uuid() }
  }
}
