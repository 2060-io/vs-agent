import { Module } from '@nestjs/common';
import { CoreService } from './core.service';
import { ApiVersion } from '@2060.io/service-agent-client';
import { ConnectionsEventModule, MessageEventModule } from '@2060.io/nestjs-client';

@Module({
  imports: [
    MessageEventModule.register({
      messageHandler: CoreService,
      url: process.env.SERVICE_AGENT_ADMIN_BASE_URL,
      version: process.env.API_VERSION as ApiVersion || ApiVersion.V1,
    }),
    ConnectionsEventModule.register({
      useTypeOrm: true,
      database: {
        type: 'postgres',
        host: process.env.POSTGRES_HOST,
        port: 5432,
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: 'chatbot',
        schema: 'public',
        ssl: false,
        synchronize: true,
        logging: true
      }
    })
  ],
  providers: [CoreService]
})
export class CoreModule {}
