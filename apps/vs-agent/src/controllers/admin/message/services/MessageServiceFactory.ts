import { IBaseMessage } from '@2060.io/vs-agent-model'
import { DidCommConnectionRecord } from '@credo-ts/didcomm'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Optional } from '@nestjs/common'
import { Queue } from 'bull'

import { REDIS_HOST } from '../../../../config/constants'

import { CoreMessageService } from './CoreMessageService'

@Injectable()
export class MessageServiceFactory {
  constructor(
    @Optional() @InjectQueue('message') private messageQueue: Queue,
    private readonly coreMessageService: CoreMessageService,
  ) {}

  async processMessage(message: IBaseMessage, connection: DidCommConnectionRecord) {
    return REDIS_HOST !== undefined
      ? await this.messageQueue.add({ message, connection })
      : await this.coreMessageService.processMessage(message, connection)
  }
}
