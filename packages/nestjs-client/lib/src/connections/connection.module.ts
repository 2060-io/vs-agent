import { Module } from '@nestjs/common'

import { ConnectionsEventController } from './connection.controller'
import { ConnectionsEventService } from './connection.service'

@Module({
  controllers: [ConnectionsEventController],
  providers: [ConnectionsEventService],
  exports: [ConnectionsEventService],
})
export class ConnectionsEventModule {}
