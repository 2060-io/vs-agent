import { Queue } from "bull";
import { CoreMessageService } from "./CoreMessageService";
import { IBaseMessage } from "../../../model";
import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { ConnectionRecord } from "@credo-ts/core";

@Injectable()
export class MessageServiceFactory {
  constructor(
    @InjectQueue('message') private messageQueue: Queue,
    private readonly coreMessageService: CoreMessageService
  ) {}

  async setProcessMessage(redisAvailable: boolean, message: IBaseMessage, connection: ConnectionRecord) {
    return redisAvailable ? await this.messageQueue.add('', { message, connection }) : await this.coreMessageService.processMessage(message, connection);
  }
}