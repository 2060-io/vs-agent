import { ConnectionStateUpdated, ExtendedDidExchangeState } from '@2060.io/model'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'

import { EVENT_HANDLER, EventHandler } from '../interfaces'

import { CONNECTIONS_REPOSITORY } from './connection.config'
import { ConnectionEntity } from './connection.entity'
import { IConnectionsRepository } from './connection.repository'

@Injectable()
export class ConnectionsEventService {
  private readonly logger = new Logger(ConnectionsEventService.name)

  constructor(
    @Inject(CONNECTIONS_REPOSITORY)
    private readonly repository: IConnectionsRepository,
    @Optional() @Inject(EVENT_HANDLER) private eventHandler?: EventHandler,
  ) {}

  async update(event: ConnectionStateUpdated): Promise<any> {
    switch (event.state) {
      case ExtendedDidExchangeState.Completed:
        const newConnection = new ConnectionEntity()
        newConnection.id = event.connectionId
        newConnection.createdTs = event.timestamp
        newConnection.status = event.state
        await this.repository.create(newConnection)

        if (this.eventHandler) {
          await this.eventHandler.newConnection(event)
        }
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
