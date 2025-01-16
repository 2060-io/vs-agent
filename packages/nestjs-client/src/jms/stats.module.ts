import { DynamicModule, Module } from '@nestjs/common'

import { StatEventOptions } from '../types'

import { StatProducerService } from './stats-producer.service'

@Module({})
export class StatEventModule {
  static forRoot(options: StatEventOptions): DynamicModule {
    return {
      module: StatEventModule,
      imports: options.imports,
      controllers: [],
      providers: [
        StatProducerService,
        {
          provide: 'GLOBAL_MODULE_OPTIONS',
          useValue: options,
        },
      ],
      exports: [StatProducerService],
    }
  }
}
