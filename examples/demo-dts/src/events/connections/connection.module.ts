import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ConnectionsEventController } from './connection.controller'
import { ConnectionEntity } from './connection.entity'
import { ConnectionsRepository } from './connection.repository'
import { ConnectionsEventService } from './connection.service'
import { CoreService } from '../../app.service'
import { SessionEntity } from '../../models'


@Module({
  imports: [
    TypeOrmModule.forFeature([ConnectionEntity]),
    TypeOrmModule.forFeature([SessionEntity])
  ],
  controllers: [ConnectionsEventController],
  providers: [ConnectionsEventService, CoreService, ConnectionsRepository],
})
export class ConnectionsEventModule {}
