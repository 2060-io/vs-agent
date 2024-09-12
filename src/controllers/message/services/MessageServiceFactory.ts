import { ConnectionRecord } from '@credo-ts/core'
import { InjectQueue } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import { Queue } from 'bull'

import { IBaseMessage } from '../../../model'

import { CoreMessageService } from './CoreMessageService'

@Injectable()
export class MessageServiceFactory {
  constructor(
    @InjectQueue('message') private messageQueue: Queue,
    private readonly coreMessageService: CoreMessageService,
  ) {}

  async setProcessMessage(redisAvailable: boolean, message: IBaseMessage, connection: ConnectionRecord) {
    return redisAvailable
      ? await this.messageQueue.add('', { message, connection })
      : await this.coreMessageService.processMessage(message, connection)
  }
}
