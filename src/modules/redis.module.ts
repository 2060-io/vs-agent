import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { FallbackMessageService, MessageService, MessageServiceFactory, RedisMessageService } from '../controllers/message/MessageService';

@Module({
    imports: [
      BullModule.forRoot({
        redis: {
          host: 'localhost',
          port: 6379,
          maxRetriesPerRequest: 1,
          enableReadyCheck: false,
        },
      }),
      BullModule.registerQueue({
        name: 'message',
      })
    ],
    exports: [BullModule]
  })
  
export class HandledRedisModule {}