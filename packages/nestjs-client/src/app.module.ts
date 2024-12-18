import { Module, DynamicModule, Provider, Type } from '@nestjs/common'

import { ConnectionsEventModule } from './connections'
import { MessageEventModule } from './messages'
import { ApiVersion } from 'packages/client/build';
import { EventHandler } from './interfaces';

export interface EventsModuleOptions {
  enableMessages?: boolean;
  enableConnections?: boolean;
  eventHandler?: Type<EventHandler>;
  url?: string;
  version?: string;
}

export const EVENTS_MODULE_OPTIONS = 'EVENTS_MODULE_OPTIONS'

@Module({})
export class EventsModule {
  static register(options: EventsModuleOptions = {}): DynamicModule {
    const imports = []

    const providers: Provider[] = [
      {
        provide: EVENTS_MODULE_OPTIONS,
        useValue: options,
      },
    ];


    if (options.enableMessages !== false) {
      imports.push(
        MessageEventModule.forRoot({
          eventHandler: options.eventHandler,
          url: options.url,
          version: options.version as ApiVersion,
        })
      )
    }

    if (options.enableConnections !== false) {
      imports.push(
        ConnectionsEventModule.forRoot({
          eventHandler: options.eventHandler,
        })
      );
    }

    return {
      module: EventsModule,
      imports,
      providers,
      exports: [
        ...imports,
        {
          provide: EVENTS_MODULE_OPTIONS,
          useValue: options,
        },
      ],
    }
  }
}
