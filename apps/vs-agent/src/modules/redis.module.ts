import { BullModule, BullModuleOptions } from '@nestjs/bull'
import { DynamicModule, Module } from '@nestjs/common'

import { REDIS_HOST, REDIS_PASSWORD } from '../config/constants'

@Module({})
export class HandledRedisModule {
  static forRoot(): DynamicModule {
    const imports = []

    if (REDIS_HOST) {
      const bullOptions: BullModuleOptions = {
        redis: {
          host: REDIS_HOST,
          port: 6379,
          password: REDIS_PASSWORD,
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
      exports: REDIS_HOST ? [BullModule] : [],
    }
  }
}
