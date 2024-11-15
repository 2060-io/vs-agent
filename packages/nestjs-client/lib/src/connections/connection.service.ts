import { ConnectionStateUpdated, ExtendedDidExchangeState } from '@2060.io/model'
import { ApiClient } from '@2060.io/service-agent-client'
import { Injectable, Logger } from '@nestjs/common'

const apiClient = new ApiClient('') //TODO: add baseURL

@Injectable()
export class ConnectionsEventService {
  private readonly logger = new Logger(ConnectionsEventService.name)

  async createConnection(event: ConnectionStateUpdated): Promise<any> {

    switch (event.state) {
      case ExtendedDidExchangeState.Completed:
        break
      case ExtendedDidExchangeState.Terminated:
        break
      default:
        break
    }
    
    return null
  }
}
