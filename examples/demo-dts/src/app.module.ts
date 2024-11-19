import { Module } from '@nestjs/common';
import { SessionEntity } from './models';
import { ConnectionEntity, ConnectionsEventModule, MessageEventModule } from '@2060.io/nestjs-client';
import { CoreService } from './app.service';
import { ApiVersion } from '@2060.io/service-agent-client';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

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
} as TypeOrmModuleOptions

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionEntity]),
    MessageEventModule.register({
      eventHandler: CoreService,
      url: process.env.SERVICE_AGENT_ADMIN_BASE_URL,
      version: process.env.API_VERSION as ApiVersion || ApiVersion.V1,
    }),
    ConnectionsEventModule.register({
      eventHandler: CoreService,
      useTypeOrm: true,
    }),
    TypeOrmModule.forRoot({
      ...defaultOptions,
      entities: [SessionEntity, ConnectionEntity]
    }),
  ],
  controllers: [],
  providers: [CoreService],
})
export class AppModule {}
