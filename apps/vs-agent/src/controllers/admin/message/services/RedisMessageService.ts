import { utils } from '@credo-ts/core'
import { DidCommConnectionRecord } from '@credo-ts/didcomm'
import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { IBaseMessage } from '@verana-labs/vs-agent-model'
import { Job } from 'bull'

import { MessageService } from '../MessageService'

@Processor('message')
export class RedisMessageService {
  private readonly logger = new Logger(RedisMessageService.name)
  constructor(private readonly messageService: MessageService) {}

  @Process()
  async processMessage(
    job: Job<{ message: IBaseMessage; connection: DidCommConnectionRecord }>,
  ): Promise<{ id: string }> {
    const { message, connection } = job.data
    this.logger.debug!(`Queuing message with Bull: ${message.id}`)
    await this.messageService.sendMessage(message, connection)
    return { id: message.id ?? utils.uuid() }
  }
}
