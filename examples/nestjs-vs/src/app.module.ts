import { Module } from '@nestjs/common'
import { CoreService } from '@/core.service'
import { ConfigModule } from '@nestjs/config'
import appConfig from '@/config/app.config'
import { AcceptLanguageResolver, HeaderResolver, I18nModule, QueryResolver } from 'nestjs-i18n'
import * as path from 'path'
import { EventsModule } from '@verana-labs/vs-agent-nestjs-client'
import { CoreModule } from '@/core.module'

@Module({
  imports: [
    CoreModule,
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-lang']),
      ],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    EventsModule.register({
      modules: {
        messages: true,
        connections: true,
        credentials: true,
      },
      options: {
        eventHandler: CoreService, // This is the service that will handle the events
        imports: [], // Add any additional dependency injection modules here that are needed for the Core Service
        // For example, if you need to inject a service from another module:
        // imports: [SomeOtherModule],
        url: process.env.VS_AGENT_ADMIN_URL,
      },
    }),
  ],
})
export class AppModule {}
