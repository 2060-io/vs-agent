import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'

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
    }),
  ],
  exports: [BullModule],
})
export class HandledRedisModule {}
