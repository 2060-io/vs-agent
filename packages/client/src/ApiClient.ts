// src/ApiClient.ts

import {
  CredentialTypeService,
  InvitationService,
  MessageService,
  RevocationRegistryService,
  TrustCredentialService,
} from './services'
import { ApiVersion } from './types'

/**
 * `ApiClient` class for easy access to the available endpoints in the Agent Service.
 * This class simplifies the interaction with the service by providing methods
 * that map the required data and allow straightforward use of the endpoints.
 *
 * Each method corresponds to an HTTP POST endpoint with a specified route
 * within the Express structure. The `ApiClient` class is designed to handle
 * events and make requests efficiently.
 *
 * Usage:
 * Extend `ApiClient` in your project and implement specific handlers to
 * interact with the available services like message sending and credential management.
 *
 * Example:
 *
 * // Initialize ApiClient with the base URL and version
 * const apiClient = new ApiClient('http://localhost', ApiVersion.V1)
 *
 * // Example to query available credentials
 * await apiClient.credentialTypes.getAll()
 *
 * // Example to send a message
 * apiClient.messages.send(message: BaseMessage)
 *
 * The `ApiClient` class provides easy methods for interacting with:
 * - `messages`: Send and manage messages.
 * - `credentialTypes`: Query and manage credential types.
 * - `revocationRegistries`: Query and manage the revocation registry for credential definitions.
 */
export class ApiClient {
  public readonly messages: MessageService
  public readonly credentialTypes: CredentialTypeService
  public readonly revocationRegistries: RevocationRegistryService
  public readonly invitations: InvitationService
  public readonly trustCredentials: TrustCredentialService

  constructor(
    private baseURL: string,
    private version: ApiVersion = ApiVersion.V1,
  ) {
    this.invitations = new InvitationService(baseURL, version)
    this.messages = new MessageService(baseURL, version)
    this.credentialTypes = new CredentialTypeService(baseURL, version)
    this.revocationRegistries = new RevocationRegistryService(baseURL, version)
    this.trustCredentials = new TrustCredentialService(baseURL, version)
  }
}
