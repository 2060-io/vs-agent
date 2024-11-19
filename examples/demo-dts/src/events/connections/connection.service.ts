import { ConnectionStateUpdated, ExtendedDidExchangeState } from '@2060.io/model'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'

import { ConnectionEntity } from './connection.entity'
import { ConnectionsRepository } from './connection.repository'
import { CoreService } from '../../app.service'

@Injectable()
export class ConnectionsEventService {
  private readonly logger = new Logger(ConnectionsEventService.name)

  constructor(
    @Inject()
    private readonly repository: ConnectionsRepository,
    private readonly coreService: CoreService,
  ) {}

  async update(event: ConnectionStateUpdated): Promise<any> {
    switch (event.state) {
      case ExtendedDidExchangeState.Completed:
        const newConnection = new ConnectionEntity()
        newConnection.id = event.connectionId
        newConnection.createdTs = event.timestamp
        newConnection.status = event.state
        await this.repository.create(newConnection)

        await this.coreService.newConnection(event)
        break
      case ExtendedDidExchangeState.Terminated:
        await this.repository.updateStatus(event.connectionId, event.state)
        break
      default:
        break
    }

    return null
  }
}
