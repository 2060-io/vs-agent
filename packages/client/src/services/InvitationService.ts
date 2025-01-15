// src/services/CredentialTypeService.ts

import {
  CreateCredentialOfferOptions,
  CreateCredentialOfferResult,
  CreateInvitationResult,
  CreatePresentationRequestOptions,
  CreatePresentationRequestResult,
} from '@2060.io/service-agent-model'
import { Logger } from 'tslog'

import { ApiVersion } from '../types/enums'

const logger = new Logger({
  name: 'InvitationService',
  type: 'pretty',
  prettyLogTemplate: '{{logLevelName}} [{{name}}]: ',
})

/**
 * `InvitationService` class for interacting with the available endpoints related to invitations.
 *
 * For a list of available endpoints and functionality, refer to the methods within this class.
 */
export class InvitationService {
  private url: string

  constructor(
    private baseURL: string,
    private version: ApiVersion,
  ) {
    this.url = `${this.baseURL.replace(/\/$/, '')}/${this.version}/invitation`
  }

  public async create(): Promise<CreateInvitationResult> {
    logger.debug('create()')
    const response = await fetch(`${this.url}`, {
      method: 'GET',
      headers: { accept: 'application/json', 'Content-Type': 'application/json' },
    })
    if (!response.ok) throw new Error(`Cannot create credential offer: status ${response.status}`)

    return (await response.json()) as CreateInvitationResult
  }

  public async createPresentationRequest(
    options: CreatePresentationRequestOptions,
  ): Promise<CreatePresentationRequestResult> {
    logger.info(`createPresentationRequest(): ${JSON.stringify(options)}`)

    const response = await fetch(`${this.url}/presentation-request`, {
      method: 'POST',
      body: JSON.stringify(options),
      headers: { accept: 'application/json', 'Content-Type': 'application/json' },
    })
    if (!response.ok) throw new Error(`Cannot create presentation request: status ${response.status}`)

    return (await response.json()) as CreatePresentationRequestResult
  }

  public async createCredentialOffer(
    options: CreateCredentialOfferOptions,
  ): Promise<CreateCredentialOfferResult> {
    logger.info(`createCredentialOffer(): ${JSON.stringify(options)}`)

    const response = await fetch(`${this.url}/credential-offer`, {
      method: 'POST',
      body: JSON.stringify(options),
      headers: { accept: 'application/json', 'Content-Type': 'application/json' },
    })
    if (!response.ok) throw new Error(`Cannot create credential offer: status ${response.status}`)

    return (await response.json()) as CreateCredentialOfferResult
  }
}
