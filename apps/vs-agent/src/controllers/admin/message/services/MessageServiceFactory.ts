import { ConnectionRecord } from '@credo-ts/core'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Optional } from '@nestjs/common'
import { IBaseMessage } from '@verana-labs/vs-agent-model'
import { Queue } from 'bull'

import { REDIS_HOST } from '../../../../config/constants'

import { CoreMessageService } from './CoreMessageService'

@Injectable()
export class MessageServiceFactory {
  constructor(
    @Optional() @InjectQueue('message') private messageQueue: Queue,
    private readonly coreMessageService: CoreMessageService,
  ) {}

  async processMessage(message: IBaseMessage, connection: ConnectionRecord) {
    return REDIS_HOST !== undefined
      ? await this.messageQueue.add({ message, connection })
      : await this.coreMessageService.processMessage(message, connection)
  }
}
