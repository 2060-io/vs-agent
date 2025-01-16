import { ApiClient, ApiVersion } from '@2060.io/service-agent-client'
import { Claim, CredentialIssuanceMessage, CredentialRevocationMessage } from '@2060.io/service-agent-model'
import { Sha256, utils } from '@credo-ts/core'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Equal, In, Not, Repository } from 'typeorm'

import { CredentialOptions } from '../types'

import { CredentialEntity } from './credential.entity'

@Injectable()
export class CredentialService {
  private readonly logger = new Logger(CredentialService.name)

  // Service agent client API
  private readonly url: string
  private readonly apiVersion: ApiVersion
  private readonly apiClient: ApiClient

  //Credential type definitions
  private maximumCredentialNumber: number = 1000

  constructor(
    @InjectRepository(CredentialEntity)
    private readonly credentialRepository: Repository<CredentialEntity>,
    @Inject('GLOBAL_MODULE_OPTIONS') private options: CredentialOptions,
    private readonly entityManager: EntityManager,
  ) {
    if (!options.url) throw new Error(`For this module to be used the value url must be added`)
    this.url = options.url
    this.apiVersion = options.version ?? ApiVersion.V1
    this.apiClient = new ApiClient(this.url, this.apiVersion)

    this.logger.debug(`Initialized with url: ${this.url}, version: ${this.apiVersion}`)
  }

  /**
   * Creates and initializes a credential type (credential definition) with optional revocation registry support.
   *
   * This method specifically handles the creation of credential types/definitions, which serve as templates
   * for issuing actual credentials.
   *
   * When revocation support is enabled:
   * - Two default revocation registries will be created
   * - This ensures continuity if one registry reaches capacity
   *
   * @param attributes - List of attributes that credentials of this type will support
   * @param options.name - Name identifier for the credential type
   * @param options.version - Version of the credential type
   * @param options.supportRevocation - Whether credentials can be revoked
   * @param options.maximumCredentialNumber - Maximum number of credentials that can be issued
   *
   * @returns Promise<void> - Resolves when the credential type and revocation registries are created
   */
  async createType(
    attributes: string[],
    options: {
      name?: string
      version?: string
      supportRevocation?: boolean
      maximumCredentialNumber?: number
    } = {},
  ) {
    const { name = 'Chatbot', version = '1.0', supportRevocation, maximumCredentialNumber } = options

    const credentialTypes = await this.apiClient.credentialTypes.getAll()
    if (maximumCredentialNumber !== undefined) this.maximumCredentialNumber = maximumCredentialNumber

    const credentialType = credentialTypes.find(
      credType => credType.name === name && credType.version === version,
    )
    if (!credentialType) {
      const credentialType = await this.apiClient.credentialTypes.create({
        id: utils.uuid(),
        name,
        version,
        attributes,
        supportRevocation,
      })

      await this.saveCredentialType(credentialType.id, supportRevocation)
      await this.saveCredentialType(credentialType.id, supportRevocation)
    }
  }

  /**
   * Sends a credential issuance to the specified connection using the provided claims.
   * This method initiates the issuance process by sending claims as part of a credential
   * to the recipient identified by the connection ID.
   *
   * @param {string} connectionId - The unique identifier of the connection to which the credential
   * will be issued. This represents the recipient of the credential.
   *
   * @param {Claim[]} claims - An array of claims representing the data to be included in the credential.
   * Each claim has a `name` (key) and a `value` (data). Example:
   * ```javascript
   * const claims = [
   *   { name: "email", value: "john.doe@example.com" },
   *   { name: "name", value: "John Doe" }
   * ];
   * ```
   *
   * @param {object} [options] - Additional options for credential issuance.
   *
   * ### Options
   * - `refId` (optional, `string`): A unique identifier for the credential. If provided:
   *   - When `revokeIfAlreadyIssued` is set to `true`, any existing credential with the same `refId`
   *     will be revoked, ensuring the credential is unique.
   *   - If `revokeIfAlreadyIssued` is set to `false` (default), multiple credentials with the same `refId` can exist
   *   - Used for managing unique credentials like official documents.
   *   - Hashed in the database for security.
   * - `credentialDefinitionId` (optional, `string`): Specifies the ID of the credential definition to use.
   *   - If not provided, the first available credential definition is used.
   * - `revokeIfAlreadyIssued` (optional, `boolean`): Whether automatic revocation is enabled (default false)
   *
   * @returns {Promise<void>} A promise that resolves when the credential issuance is successfully sent.
   * If an error occurs during the process, the promise will be rejected with the relevant error message.
   *
   */
  async issue(
    connectionId: string,
    claims: Claim[],
    options?: {
      refId?: string
      credentialDefinitionId?: string
      revokeIfAlreadyIssued?: boolean
    },
  ): Promise<void> {
    const { revokeIfAlreadyIssued = false } = options ?? {}
    const refIdHash = options?.refId ? this.refIdHash(options.refId) : null
    const credentialTypes = await this.apiClient.credentialTypes.getAll()
    const credentialType =
      credentialTypes.find(credType => credType.id === options?.credentialDefinitionId) ?? credentialTypes[0]
    if (!credentialType) {
      throw new Error(
        'No credential definitions found. Please configure a credential using the create method before proceeding.',
      )
    }
    const { id: credentialDefinitionId, revocationSupported } = credentialType

    const cred = await this.credentialRepository.findOne({
      where: {
        revoked: false,
        ...(refIdHash ? { refIdHash } : {}),
      },
    })
    if (cred && revokeIfAlreadyIssued) {
      cred.connectionId = connectionId
      await this.credentialRepository.save(cred)
      await this.revoke(connectionId, { refId: options?.refId ?? undefined })
    }

    const { revocationRegistryDefinitionId, revocationRegistryIndex } = await this.entityManager.transaction(
      async transaction => {
        if (!revocationSupported) {
          await transaction.save(CredentialEntity, {
            connectionId,
            credentialDefinitionId,
            ...(refIdHash ? { refIdHash } : {}),
          })
          return {
            revocationRegistryDefinitionId: undefined,
            revocationRegistryIndex: undefined,
          }
        }
        const invalidRegistries = await transaction.find(CredentialEntity, {
          select: ['revocationDefinitionId'],
          where: {
            credentialDefinitionId,
            revocationRegistryIndex: Equal(this.maximumCredentialNumber - 1),
          },
        })
        const invalidRevocationIds = invalidRegistries.map(reg => reg.revocationDefinitionId)

        let lastCred = await transaction.findOne(CredentialEntity, {
          where: {
            credentialDefinitionId,
            revocationRegistryIndex: Not(Equal(this.maximumCredentialNumber)),
            ...(invalidRevocationIds.length > 0
              ? {
                  revocationDefinitionId: Not(In(invalidRevocationIds)),
                }
              : {}),
          },
          order: { revocationRegistryIndex: 'DESC' },
          lock: { mode: 'pessimistic_write' },
        })
        if (!lastCred || lastCred.revocationRegistryIndex == null) {
          lastCred = await transaction.findOne(CredentialEntity, {
            where: {
              credentialDefinitionId,
              revocationRegistryIndex: Equal(this.maximumCredentialNumber),
            },
            order: { createdTs: 'DESC' },
            lock: { mode: 'pessimistic_write' },
          })

          if (!lastCred)
            throw new Error(
              'No valid registry definition found. Please restart the service and ensure the module is imported correctly',
            )
          lastCred.revocationRegistryIndex = -1
        }

        const newCredential = await transaction.save(CredentialEntity, {
          connectionId,
          credentialDefinitionId,
          revocationDefinitionId: lastCred.revocationDefinitionId,
          revocationRegistryIndex: lastCred.revocationRegistryIndex + 1,
          ...(refIdHash ? { refIdHash } : {}),
          maximumCredentialNumber: this.maximumCredentialNumber,
        })
        return {
          revocationRegistryDefinitionId: newCredential.revocationDefinitionId,
          revocationRegistryIndex: newCredential.revocationRegistryIndex,
        }
      },
    )

    await this.apiClient.messages.send(
      new CredentialIssuanceMessage({
        connectionId,
        credentialDefinitionId,
        revocationRegistryDefinitionId,
        revocationRegistryIndex,
        claims: claims,
      }),
    )
    if (revocationRegistryIndex === this.maximumCredentialNumber - 1) {
      const revRegistry = await this.saveCredentialType(credentialDefinitionId, revocationSupported)
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
      where: {
        connectionId,
        revoked: false,
      },
      order: { createdTs: 'DESC' },
    })
    if (!cred) throw new Error(`Credential not found with connectionId: ${connectionId}`)

    cred.threadId = threadId
    await this.credentialRepository.save(cred)
  }

  /**
   * Rejected a credential by associating it with the provided thread ID.
   * @param connectionId - The connection ID associated with the credential.
   * @param threadId - The thread ID to link with the credential.
   * @throws Error if no credential is found with the specified connection ID.
   */
  async reject(connectionId: string, threadId: string): Promise<void> {
    const cred = await this.credentialRepository.findOne({
      where: {
        connectionId,
        revoked: false,
      },
      order: { createdTs: 'DESC' },
    })
    if (!cred) throw new Error(`Credential with connectionId ${connectionId} not found.`)

    cred.threadId = threadId
    cred.revoked = true
    await this.credentialRepository.save(cred)
  }

  /**
   * Revokes a credential associated with the provided thread ID.
   * @param threadId - The thread ID linked to the credential to revoke.
   * @throws Error if no credential is found with the specified thread ID or if the credential has no connection ID.
   */
  async revoke(connectionId: string, options?: { refId?: string }): Promise<void> {
    const refIdHash = options?.refId ? this.refIdHash(options.refId) : null
    const cred = await this.credentialRepository.findOne({
      where: { connectionId, revoked: false, ...(refIdHash ? { refIdHash } : {}) },
      order: { createdTs: 'DESC' },
    })
    if (!cred || !cred.connectionId) {
      throw new Error(`Credencial with connectionId ${connectionId} not found.`)
    }

    cred.revoked = true
    await this.credentialRepository.save(cred)

    const credentialTypes = await this.apiClient.credentialTypes.getAll()
    const credentialType =
      credentialTypes.find(credType => credType.id === cred.credentialDefinitionId) ?? credentialTypes[0]
    credentialType.revocationSupported &&
      (await this.apiClient.messages.send(
        new CredentialRevocationMessage({
          connectionId: cred.connectionId,
          threadId: cred?.threadId,
        }),
      ))
    this.logger.log(`Revoke Credential: ${cred.id}`)
  }

  // private methods
  private async saveCredentialType(
    credentialDefinitionId: string,
    supportRevocation: boolean = false,
  ): Promise<string | null> {
    if (!supportRevocation) {
      await this.credentialRepository.save({ credentialDefinitionId })
      return null
    }
    const revocationRegistry = await this.apiClient.revocationRegistry.create({
      credentialDefinitionId,
      maximumCredentialNumber: this.maximumCredentialNumber,
    })
    if (!revocationRegistry)
      throw new Error(
        `Unable to create a new revocation registry for CredentialDefinitionId: ${credentialDefinitionId}`,
      )
    await this.credentialRepository.save({
      credentialDefinitionId,
      revocationDefinitionId: revocationRegistry,
      revocationRegistryIndex: this.maximumCredentialNumber,
    })
    return revocationRegistry
  }

  private refIdHash(refId: string): string {
    return Buffer.from(new Sha256().hash(refId)).toString('hex')
  }
}
