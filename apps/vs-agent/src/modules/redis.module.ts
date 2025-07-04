import { BullModule, BullModuleOptions } from '@nestjs/bull'
import { DynamicModule, Module } from '@nestjs/common'

@Module({})
export class HandledRedisModule {
  static forRoot(): DynamicModule {
    const imports = []

    if (process.env.REDIS_HOST) {
      const bullOptions: BullModuleOptions = {
        redis: {
          host: process.env.REDIS_HOST,
          port: 6379,
          password: process.env.REDIS_PASSWORD,
          maxRetriesPerRequest: 3,
          connectTimeout: 5000,
        },
      }

      imports.push(
        BullModule.forRoot(bullOptions),
        BullModule.registerQueue({
          name: 'message',
        }),
      )
    }

    return {
      module: HandledRedisModule,
      imports,
      exports: process.env.REDIS_HOST ? [BullModule] : [],
    }
  }
}
