import { Module } from '@nestjs/common';
import { ModelsModule, SessionEntity } from './models';
import { ConnectionsEventModule, MessageEventModule, PostgresOptions } from '@2060.io/nestjs-client';
import { CoreService } from './app.service';
import { ApiVersion } from '@2060.io/service-agent-client';
import { TypeOrmModule } from '@nestjs/typeorm';

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
  logging: true
} as PostgresOptions;

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...defaultOptions,
      entities: [SessionEntity]
    }),
    ModelsModule,
    MessageEventModule.register({
      messageHandler: CoreService,
      url: process.env.SERVICE_AGENT_ADMIN_BASE_URL,
      version: process.env.API_VERSION as ApiVersion || ApiVersion.V1,
    }),
    ConnectionsEventModule.register({
      useTypeOrm: true,
      database: {
        ...defaultOptions,
      }
    })
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
