import { ApiVersion } from '@2060.io/service-agent-client'
import { DynamicModule, Module, Provider, Type } from '@nestjs/common'

import { MessageEventController } from './message.controller'
import { MessageEventService } from './message.service'
import { CoreService } from '../../app.service'
import { SessionEntity } from '../../models'
import { TypeOrmModule } from '@nestjs/typeorm'

@Module({
  imports: [TypeOrmModule.forFeature([SessionEntity])],
  controllers: [MessageEventController],
  providers: [MessageEventService, CoreService],
})
export class MessageEventModule {}
