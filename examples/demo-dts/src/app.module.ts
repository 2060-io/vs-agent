import { Module } from '@nestjs/common'
import { CoreService } from '@/core.service'
import { ConfigModule } from '@nestjs/config'
import appConfig from '@/config/app.config'
import { AcceptLanguageResolver, HeaderResolver, I18nModule, QueryResolver } from 'nestjs-i18n'
import * as path from 'path'
import { EventsModule } from '@2060.io/service-agent-nestjs-client'
import { ApiVersion } from '@2060.io/service-agent-client'
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
        eventHandler: CoreService,
        imports: [],
        url: process.env.SERVICE_AGENT_ADMIN_URL,
        version: ApiVersion.V1,
      },
    }),
  ],
})
export class AppModule {}
