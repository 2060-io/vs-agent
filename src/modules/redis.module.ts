import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'

@Module({
    imports: [
      BullModule.forRoot({
        redis: {
          host: process.env.REDIS_HOST,
          port: 6379,
          password: process.env.REDIS_PASSWORD,
        },
      }),
      BullModule.registerQueue({
        name: 'message',
      })
    ],
    exports: [BullModule]
  })
  
export class HandledRedisModule {}