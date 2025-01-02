import { ApiClient, ApiVersion } from '@2060.io/service-agent-client'
import { Claim, CredentialIssuanceMessage, CredentialRevocationMessage } from '@2060.io/service-agent-model'
import { Sha256, utils } from '@credo-ts/core'
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Equal, In, Not, Repository } from 'typeorm'

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
        id: utils.uuid(),
        name: this.name,
        version: this.version,
        attributes: this.attributes,
        supportRevocation: this.supportRevocation,
      })

      await this.createRevocationRegistry(credential.id)
      await this.createRevocationRegistry(credential.id)
    }
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
  async issuance(connectionId: string, records: Record<string, any>, hash: string): Promise<void> {
    const [{ id: credentialDefinitionId }] = await this.apiClient.credentialTypes.getAll()
    const claims = Object.entries(records).map(
      ([key, value]) => new Claim({ name: key, value: value ?? null }),
    )

    const { revocationDefinitionId, revocationRegistryIndex } = await this.entityManager.transaction(
      async transaction => {
        const invalidRegistries = await transaction.find(CredentialEntity, {
          select: ['revocationDefinitionId'],
          where: {
            credentialDefinitionId,
            revocationRegistryIndex: Equal(this.maximumCredentialNumber),
          },
        })
        const invalidRevocationIds = invalidRegistries.map(reg => reg.revocationDefinitionId)

        let lastCred = await transaction.findOne(CredentialEntity, {
          where: {
            credentialDefinitionId,
            revocationRegistryIndex: Not(Equal(0)),
            ...(invalidRevocationIds.length > 0
              ? {
                  revocationDefinitionId: Not(In(invalidRevocationIds)),
                }
              : {}),
          },
          order: { revocationRegistryIndex: 'DESC' },
          lock: { mode: 'pessimistic_write' },
        })
        if (!lastCred) {
          lastCred = await transaction.findOne(CredentialEntity, {
            where: {
              credentialDefinitionId,
              revocationRegistryIndex: Equal(0),
            },
            order: { createdTs: 'DESC' },
            lock: { mode: 'pessimistic_write' },
          })

          if (!lastCred)
            throw new Error(
              'No valid registry definition found. Please restart the service and ensure the module is imported correctly',
            )
        }

        const newCredential = await transaction.save(CredentialEntity, {
          connectionId,
          credentialDefinitionId,
          revocationDefinitionId: lastCred.revocationDefinitionId,
          revocationRegistryIndex: lastCred.revocationRegistryIndex + 1,
          hash: Buffer.from(new Sha256().hash(hash)),
          maximumCredentialNumber: lastCred.maximumCredentialNumber,
        })
        return {
          revocationDefinitionId: newCredential.revocationDefinitionId,
          revocationRegistryIndex: newCredential.revocationRegistryIndex,
        }
      },
    )

    await this.apiClient.messages.send(
      new CredentialIssuanceMessage({
        connectionId,
        credentialDefinitionId,
        revocationRegistryDefinitionId: revocationDefinitionId,
        revocationRegistryIndex: revocationRegistryIndex,
        claims: claims,
      }),
    )
    if (revocationRegistryIndex === this.maximumCredentialNumber) {
      const revRegistry = await this.createRevocationRegistry(credentialDefinitionId)
      this.logger.log(`Revocation registry successfully created with ID ${revRegistry}`)
    }
    this.logger.debug('sendCredential with claims: ' + JSON.stringify(claims))
  }

  /**
   * Accepts a credential by associating it with the provided thread ID.
   * @param connectionId - The connection ID associated with the credential.
   * @param threadId - The thread ID to link with the credential.
   * @throws Error if no credential is found with the specified connection ID.
   */
  async accept(connectionId: string, threadId: string): Promise<void> {
    const cred = await this.credentialRepository.findOne({
      where: { connectionId: connectionId },
      order: { createdTs: 'DESC' }, // TODO: improve the search method on differents revocation
    })
    if (!cred) throw new Error(`Credential not found with connectionId: ${connectionId}`)
    await this.credentialRepository.update(cred.id, { threadId })
  }

  /**
   * Revokes a credential associated with the provided thread ID.
   * @param threadId - The thread ID linked to the credential to revoke.
   * @throws Error if no credential is found with the specified thread ID or if the credential has no connection ID.
   */
  async revoke(connectionId: string): Promise<void> {
    const cred = await this.credentialRepository.findOne({ where: { connectionId } })
    if (!cred || !cred.connectionId) {
      throw new Error(`Credencial with threadId ${cred?.threadId} not found`)
    }

    await this.credentialRepository.update(cred.id, { revoked: true })
    await this.apiClient.messages.send(
      new CredentialRevocationMessage({
        connectionId: cred.connectionId,
        threadId: cred?.threadId,
      }),
    )
    this.logger.log(`Revoke Credential: ${cred.id}`)
  }

  // private methods
  private async createRevocationRegistry(credentialDefinitionId: string): Promise<string> {
    const revocationRegistry = await this.apiClient.revocationRegistry.create({
      credentialDefinitionId,
      maximumCredentialNumber: this.maximumCredentialNumber,
    })
    if (!revocationRegistry)
      throw new Error(
        `Unable to create a new revocation registry for CredentialDefinitionId: ${credentialDefinitionId}`,
      )
    const credentialRev = this.credentialRepository.create({
      credentialDefinitionId,
      revocationDefinitionId: revocationRegistry,
      revocationRegistryIndex: 0,
      maximumCredentialNumber: this.maximumCredentialNumber,
    })
    await this.credentialRepository.save(credentialRev)
    return revocationRegistry
  }
}
