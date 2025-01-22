import { DynamicModule, Module } from '@nestjs/common'

import { CredentialOptions } from '../types'

import { CredentialService } from './credential.service'

@Module({})
export class CredentialModule {
  static forRoot(options: CredentialOptions): DynamicModule {
    return {
      module: CredentialModule,
      imports: options.imports,
      controllers: [],
      providers: [
        CredentialService,
        {
          provide: 'GLOBAL_MODULE_OPTIONS',
          useValue: options,
        },
      ],
      exports: [CredentialService],
    }
  }
}
