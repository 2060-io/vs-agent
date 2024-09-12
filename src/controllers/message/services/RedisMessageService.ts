import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { IBaseMessage } from "../../../model";
import { ConnectionRecord, utils } from "@credo-ts/core";
import { Logger } from "@nestjs/common";
import { MessageService } from "../MessageService";

@Processor('message')
export class RedisMessageService {
  private readonly logger = new Logger(RedisMessageService.name)
  constructor( private readonly messageService: MessageService ) {}

  @Process()
  async processMessage(job: Job<{ message: IBaseMessage, connection: ConnectionRecord }>): Promise<{ id: string }> {
    const { message, connection } = job.data
    this.logger.debug!(`Queuing message with Bull: ${message.id}`);
    await this.messageService.sendMessage( message, connection );
    return { id: message.id ?? utils.uuid() };
  }
}