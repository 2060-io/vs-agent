import { Module } from '@nestjs/common';
import { SessionEntity } from './models';
import { CoreService } from './app.service';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import { AcceptLanguageResolver, HeaderResolver, I18nJsonLoader, I18nModule, I18nService, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';
import { ConnectionEntity, ConnectionsEventModule, MessageEventModule } from './events';

const defaultOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_USER,
  schema: 'public',
  synchronize: true,
  ssl: false,
  logging: false
} as TypeOrmModuleOptions

@Module({
  imports: [
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
    TypeOrmModule.forFeature([SessionEntity]),
    MessageEventModule,
    ConnectionsEventModule,
    TypeOrmModule.forRoot({
      ...defaultOptions,
      entities: [SessionEntity, ConnectionEntity]
    }),
  ],
  controllers: [],
  providers: [CoreService],
})
export class AppModule {}
