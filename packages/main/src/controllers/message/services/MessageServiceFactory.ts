import { IBaseMessage } from '@2060.io/service-agent-model'
import { ConnectionRecord } from '@credo-ts/core'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Optional } from '@nestjs/common'
import { Queue } from 'bull'

import { CoreMessageService } from './CoreMessageService'

@Injectable()
export class MessageServiceFactory {
  constructor(
    @Optional() @InjectQueue('message') private messageQueue: Queue,
    private readonly coreMessageService: CoreMessageService,
  ) {}

  async processMessage(message: IBaseMessage, connection: ConnectionRecord) {
    return process.env.REDIS_HOST !== undefined
      ? await this.messageQueue.add({ message, connection })
      : await this.coreMessageService.processMessage(message, connection)
  }
}
