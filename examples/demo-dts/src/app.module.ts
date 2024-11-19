import { Module } from '@nestjs/common';
import { SessionEntity } from './models';
import { ConnectionEntity, ConnectionsEventModule, MessageEventModule } from '@2060.io/nestjs-client';
import { CoreService } from './app.service';
import { ApiVersion } from '@2060.io/service-agent-client';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from './config/app.config';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: configService.get<string>('appConfig.postgresHost'),
        port: 5432,
        username: configService.get<string>('appConfig.postgresUser'),
        password: configService.get<string>('appConfig.postgresPassword'),
        database: configService.get<string>('appConfig.postgresUser'),
        schema: 'public',
        synchronize: true,
        ssl: false,
        logging: false,
        entities: [SessionEntity, ConnectionEntity],
      }),
    }),

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
  ],
  controllers: [],
  providers: [CoreService],
})
export class AppModule {}
