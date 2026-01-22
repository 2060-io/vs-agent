// src/services/RevocationRegistryService.ts

import { RevocationRegistryInfo } from '@verana-labs/vs-agent-model'
import { Logger } from 'tslog'

import { ApiVersion } from '../types/enums'

const logger = new Logger({
  name: 'RevocationRegistryService',
  type: 'pretty',
  prettyLogTemplate: '{{logLevelName}} [{{name}}]: ',
})

/**
 * `RevocationRegistryService` class for managing credential types and interacting with
 * the available endpoints related to credential types in the Agent Service.
 *
 * This class provides methods for querying, creating, and managing revocation registry on credential types.
 * For a list of available endpoints and functionality, refer to the methods within this class.
 */
export class RevocationRegistryService {
  private url: string

  constructor(
    private baseURL: string,
    private version: ApiVersion,
  ) {
    this.url = `${this.baseURL.replace(/\/$/, '')}/${this.version}/credential-types`
  }

  public async create(options: RevocationRegistryInfo): Promise<string | undefined> {
    const response = await fetch(`${this.url}/revocationRegistry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    })

    if (!response.ok) {
      logger.error(`Failed to create revocation registry`)
      return undefined
    }

    return await response.text()
  }

  public async get(credentialDefinitionId: string): Promise<string[]> {
    const response = await fetch(
      `${this.url}/revocationRegistry?credentialDefinitionId=${encodeURIComponent(credentialDefinitionId)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch revocation definitions: ${response.statusText}`)
    }

    return (await response.json()) as string[]
  }

  public async getAll(): Promise<string[]> {
    const response = await fetch(`${this.url}/revocationRegistry`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch revocation registries: ${response.statusText}`)
    }

    return (await response.json()) as string[]
  }
}
