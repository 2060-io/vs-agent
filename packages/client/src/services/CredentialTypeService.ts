// src/services/CredentialTypeService.ts

import {
  CredentialTypeInfo,
  CredentialTypeResult,
  ImportCredentialTypeOptions,
} from '@2060.io/vs-agent-model'
import { Logger } from 'tslog'

import { ApiVersion } from '../types/enums'

const logger = new Logger({
  name: 'CredentialTypeService',
  type: 'pretty',
  prettyLogTemplate: '{{logLevelName}} [{{name}}]: ',
})

/**
 * `CredentialTypeService` class for managing credential types and interacting with
 * the available endpoints related to credential types in the Agent Service.
 *
 * This class provides methods for querying, creating, and managing credential types.
 * For a list of available endpoints and functionality, refer to the methods within this class.
 */
export class CredentialTypeService {
  private url: string

  constructor(
    private baseURL: string,
    private version: ApiVersion,
  ) {
    this.url = `${this.baseURL.replace(/\/$/, '')}/${this.version}/credential-types`
  }

  public async import(importData: ImportCredentialTypeOptions): Promise<CredentialTypeInfo> {
    logger.info(`Importing credential type ${importData.id}`)
    const response = await fetch(`${this.url}/import`, {
      method: 'POST',
      body: JSON.stringify(importData),
      headers: { accept: 'application/json', 'Content-Type': 'application/json' },
    })
    if (!response.ok) throw new Error(`Cannot import credential type: status ${response.status}`)

    return (await response.json()) as CredentialTypeInfo
  }

  public async export(credentialTypeId: string) {
    logger.info(`Exporting credential type ${credentialTypeId}`)
    const response = await fetch(`${this.url}/export/${encodeURIComponent(credentialTypeId)}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`Cannot export credential type: status ${response.status}}`)

    return await response.json()
  }

  public async create(credentialType: CredentialTypeInfo): Promise<CredentialTypeInfo> {
    const response = await fetch(`${this.url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentialType),
    })
    return (await response.json()) as CredentialTypeInfo
  }

  public async getAll(): Promise<CredentialTypeResult[]> {
    const response = await fetch(this.url, {
      method: 'GET',
      headers: { accept: 'application/json', 'Content-Type': 'application/json' },
    })

    const types = await response.json()

    if (!Array.isArray(types)) {
      throw new Error('Invalid response from VS Agent')
    }

    return types.map(value => value as CredentialTypeResult)
  }
}
