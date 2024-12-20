import { DynamicModule, Module } from '@nestjs/common'

import { CredentialEventOptions } from '../types'
import { CredentialEventService } from './credential.service'

@Module({})
export class CredentialEventModule {
  static forRoot(options: CredentialEventOptions): DynamicModule {
    return {
      module: CredentialEventModule,
      imports: options.imports,
      controllers: [],
      providers: [
        CredentialEventService,
        {
          provide: 'EVENT_MODULE_OPTIONS',
          useValue: options,
        },
      ],
      exports: [CredentialEventService]
    }
  }
}
