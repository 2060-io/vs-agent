// src/ApiClient.ts

import { Logger } from 'tslog'
import { CredentialTypeService } from './services/CredentialTypeService'
import { MessageService } from './services/MessageService'
import { ApiVersion } from './types/enums'

const logger = new Logger()

export class ApiClient {
  public readonly message: MessageService
  public readonly credentialType: CredentialTypeService

  constructor(
    private baseURL: string,
    private version: ApiVersion = ApiVersion.V1,
  ) {
    this.message = new MessageService(baseURL, version)
    this.credentialType = new CredentialTypeService(baseURL, version)
    logger.info(`API Client initialized - Base URL: ${baseURL} - API Version: ${version}`)
  }
}
