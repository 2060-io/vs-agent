import { ApiClient, ApiVersion } from '@2060.io/service-agent-client'
import { Claim, CredentialIssuanceMessage, CredentialRevocationMessage } from '@2060.io/service-agent-model'
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'

import { CredentialEventOptions } from '../types'

import { CredentialEntity } from './credential.entity'

@Injectable()
export class CredentialEventService implements OnModuleInit {
  private readonly logger = new Logger(CredentialEventService.name)

  // Service agent client API
  private readonly url: string
  private readonly apiVersion: ApiVersion
  private readonly apiClient: ApiClient
  
  //Credential type definitions
  private readonly name: string
  private readonly version: string
  private readonly attributes: string[]
  private readonly supportRevocation: boolean
  private readonly maximumCredentialNumber: number

  constructor(
    @InjectRepository(CredentialEntity)
    private readonly credentialRepository: Repository<CredentialEntity>,
    @Inject('EVENT_MODULE_OPTIONS') private options: CredentialEventOptions,
    private readonly entityManager: EntityManager,
  ) {
    if (!options.url) throw new Error(`For this module to be used the value url must be added`)
    this.url = options.url
    this.apiVersion = options.version ?? ApiVersion.V1

    if (!options.creds?.attributes)
      throw new Error(`For this module to be used, the parameter credential types must be added`)
    this.name = options.creds?.name ?? 'Chatbot'
    this.version = options.creds?.version ?? '1.0'
    this.attributes = options.creds?.attributes
    this.supportRevocation = options.creds?.supportRevocation ?? false
    this.maximumCredentialNumber = options.creds?.maximumCredentialNumber ?? 1000

    this.apiClient = new ApiClient(this.url, this.apiVersion)

    this.logger.debug(`Initialized with url: ${this.url}, version: ${this.apiVersion}`)
  }

  async onModuleInit() {
    const [credential] = await this.apiClient.credentialTypes.getAll()

    if (!credential) {
      const credential = await this.apiClient.credentialTypes.create({
        id: '', // TODO: implement uuid
        name: this.name,
        version: this.version,
        attributes: this.attributes,
        supportRevocation: this.supportRevocation,
      })

      await this.createRevocationRegistry(credential.id)
    }
  }

  async createRevocationRegistry(credentialDefinitionId: string) {
    const revocationRegistry = await this.apiClient.revocationRegistry.create({
      credentialDefinitionId,
      maximumCredentialNumber: this.maximumCredentialNumber,
    })
    const credentialRev = this.credentialRepository.create({
      credentialDefinitionId,
      revocationDefinitionId: revocationRegistry,
      revocationRegistryIndex: 0,
      maximumCredentialNumber: this.maximumCredentialNumber,
    })
    await this.credentialRepository.save(credentialRev)
  }

  /**
   * Sends a credential issuance to the specified connection using the provided claims.
   * This method initiates the issuance process by sending claims as part of a credential to
   * the recipient identified by the connection ID.
   *
   * @param {string} connectionId - The unique identifier of the connection to which the credential
   * will be issued. This represents the recipient of the credential.
   *
   * @param {Record<string, any>} records - A key value objects, where each key represents an attribute
   * of the credential.
   *
   * Example of constructing the `records` array:
   * const records = {
   *   { name: "email", value: "john.doe@example.com" },
   *   { name: "name", value: "John Doe" },
   * }
   *
   * @returns {Promise<void>} A promise that resolves when the credential issuance is successfully
   * sent. If an error occurs during the process, the promise will be rejected.
   */

  async accept(connectionId: string, threadId: string): Promise<void> {
    const cred = await this.credentialRepository.findOne({
      where: { connectionId: connectionId },
      order: { createdTs: 'DESC' },
    })
    if (!cred) throw new Error(`Credential not found with connectionId: ${connectionId}`)
    await this.credentialRepository.update(cred.id, { threadId })
  }

  async revoke(threadId: string): Promise<void> {
    const cred = await this.credentialRepository.findOne({ where: { threadId } })
    if (!cred || !cred.connectionId) {
      throw new Error(`Credencial with threadId ${threadId} not found`)
    }

    await this.credentialRepository.update(cred.id, { revoked: true })
    await this.apiClient.messages.send(
      new CredentialRevocationMessage({
        connectionId: cred.connectionId,
        threadId,
      }),
    )
    this.logger.log(`Revoke Credential: ${cred.id}`)
  }
}
