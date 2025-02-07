import { ApiClient, ApiVersion } from '@2060.io/service-agent-client'
import { Claim, CredentialIssuanceMessage, CredentialRevocationMessage } from '@2060.io/service-agent-model'
import { Sha256, utils } from '@credo-ts/core'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, FindOneOptions, IsNull, Not, Repository } from 'typeorm'

import { CredentialOptions, CredentialStatus } from '../types'

import { CredentialEntity } from './credential.entity'
import { RevocationRegistryEntity } from './revocation-registry.entity'

@Injectable()
export class CredentialService {
  private readonly logger = new Logger(CredentialService.name)

  // Service agent client API
  private readonly url: string
  private readonly apiVersion: ApiVersion
  private readonly apiClient: ApiClient

  constructor(
    @InjectRepository(CredentialEntity)
    private readonly credentialRepository: Repository<CredentialEntity>,
    @InjectRepository(RevocationRegistryEntity)
    private readonly revocationRepository: Repository<RevocationRegistryEntity>,
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
    name: string,
    version: string,
    attributes: string[],
    options: {
      supportRevocation?: boolean
      maximumCredentialNumber?: number
    } = {},
  ) {
    const { supportRevocation, maximumCredentialNumber } = options

    const credentialTypes = await this.apiClient.credentialTypes.getAll()
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

      if (supportRevocation) {
        // Both records are created to handle multiple credentials
        await this.createRevocationRegistry(credentialType.id, maximumCredentialNumber)
        await this.createRevocationRegistry(credentialType.id, maximumCredentialNumber)
      }
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
    const refIdHash = options?.refId ? this.hash(options.refId) : null

    // Find a specific credential type based on provided definition ID or default to first available
    const credentialTypes = await this.apiClient.credentialTypes.getAll()
    const credentialType =
      credentialTypes.find(credType => credType.id === options?.credentialDefinitionId) ?? credentialTypes[0]
    if (!credentialType) {
      throw new Error(
        'No credential definitions found. Please configure a credential using the create method before proceeding.',
      )
    }
    const { id: credentialDefinitionId, revocationSupported } = credentialType

    // If existing credentials are found and revocation is requested, revoke all of them
    const creds = await this.credentialRepository.find({
      where: {
        status: CredentialStatus.ACCEPTED,
        ...(refIdHash ? { refIdHash } : {}),
      },
    })
    if (creds && revokeIfAlreadyIssued) {
      for (const cred of creds) {
        await this.revoke(connectionId, cred.threadId)
      }
    }

    // Begin a transaction to save new credentials and handle revocation logic if supported
    const cred: CredentialEntity = await this.entityManager.transaction(async transaction => {
      if (!revocationSupported) {
        return await transaction.save(CredentialEntity, {
          connectionId,
          ...(refIdHash ? { refIdHash } : {}),
        })
      }

      // Find last issued credential in revocation registry or create a new registry if none exists
      let lastCred = await transaction
        .createQueryBuilder(RevocationRegistryEntity, 'registry')
        .where('registry.currentIndex != registry.maximumCredentialNumber')
        .andWhere('registry.credentialDefinitionId = :credentialDefinitionId', { credentialDefinitionId })
        .orderBy('registry.currentIndex', 'DESC')
        .setLock('pessimistic_write') // Lock row for safe concurrent access
        .getOne()

      // Create new registry if none found
      if (!lastCred) lastCred = await this.createRevocationRegistry(credentialDefinitionId)

      await transaction.save(RevocationRegistryEntity, lastCred)
      return await transaction.save(CredentialEntity, {
        connectionId,
        revocationRegistryIndex: lastCred.currentIndex,
        revocationRegistry: lastCred,
        ...(refIdHash ? { refIdHash } : {}),
      })
    })

    // Send a message containing the newly issued credential details via API client
    const thread = await this.apiClient.messages.send(
      new CredentialIssuanceMessage({
        connectionId,
        credentialDefinitionId,
        revocationRegistryDefinitionId: cred.revocationRegistry?.revocationDefinitionId,
        revocationRegistryIndex: cred.revocationRegistry?.currentIndex,
        claims: claims,
      }),
    )
    cred.threadId = thread.id
    cred.status = CredentialStatus.OFFERED
    await this.credentialRepository.save(cred)
    if (cred.revocationRegistry) {
      cred.revocationRegistry.currentIndex += 1
      this.revocationRepository.save(cred.revocationRegistry)

      // Check if maximum capacity has been reached and create a new revocation registry if necessary
      if (cred.revocationRegistry?.currentIndex === cred.revocationRegistry?.maximumCredentialNumber) {
        const revRegistry = await this.createRevocationRegistry(
          credentialDefinitionId,
          cred.revocationRegistry?.maximumCredentialNumber,
        )
        this.logger.log(`Revocation registry successfully created with ID ${revRegistry}`)
      }
    }
    this.logger.debug('sendCredential with claims: ' + JSON.stringify(claims))
  }

  /**
   * Accepts a credential by associating it with the provided thread ID.
   * @param connectionId - The connection ID associated with the credential.
   * @param threadId - The thread ID to link with the credential.
   * @throws Error if no credential is found with the specified connection ID.
   */
  async handleAcceptance(threadId: string): Promise<void> {
    const cred = await this.credentialRepository.findOne({
      where: {
        threadId,
        status: CredentialStatus.OFFERED,
      },
      order: { createdTs: 'DESC' },
    })
    if (!cred) throw new Error(`Credential not found with threadId: ${threadId}`)

    cred.status = CredentialStatus.ACCEPTED
    await this.credentialRepository.save(cred)
  }

  /**
   * Rejected a credential by associating it with the provided thread ID.
   * @param connectionId - The connection ID associated with the credential.
   * @param threadId - The thread ID to link with the credential.
   * @throws Error if no credential is found with the specified connection ID.
   */
  async handleRejection(threadId: string): Promise<void> {
    const cred = await this.credentialRepository.findOne({
      where: {
        threadId,
        status: CredentialStatus.OFFERED,
      },
      order: { createdTs: 'DESC' },
    })
    if (!cred) throw new Error(`Credential with threadId ${threadId} not found.`)

    cred.status = CredentialStatus.REJECTED
    await this.credentialRepository.save(cred)
  }

  /**
   * Revokes a credential associated with the provided thread ID.
   * @param connectionId - The connection ID to send the revoke. (Search by connection ID if no thread ID)
   * @param threadId - (Optional) The thread ID linked to the credential to revoke.
   * @throws Error if no credential is found with the specified thread ID or connection ID, or if the credential has no connection ID.
   */
  async revoke(connectionId: string, threadId?: string): Promise<void> {
    // Define search options based on whether a thread ID is provided
    const options: FindOneOptions<CredentialEntity> = threadId
      ? { where: { threadId, status: CredentialStatus.ACCEPTED } }
      : {
          where: { connectionId, status: CredentialStatus.ACCEPTED, threadId: Not(IsNull()) },
          order: { createdTs: 'DESC' },
        }
    const cred = await this.credentialRepository.findOne(options)

    if (!cred)
      throw new Error(`Credential not found with threadId "${threadId}" or connectionId "${connectionId}".`)

    // Save the updated credential back to the repository with the new status 'revoked'
    cred.status = CredentialStatus.REVOKED
    await this.credentialRepository.save(cred)

    const credentialTypes = await this.apiClient.credentialTypes.getAll()
    const credentialType =
      credentialTypes.find(credType => credType.id === cred.revocationRegistry?.credentialDefinitionId) ??
      credentialTypes[0]

    // If revocation is not supported for this credential type, return
    if (!credentialType.revocationSupported) {
      this.logger.warn(
        `Credential definition ${cred.revocationRegistry?.credentialDefinitionId} does not support revocation.`,
      )
      return
    }

    // Send a revocation message using the API client
    await this.apiClient.messages.send(
      new CredentialRevocationMessage({
        connectionId,
        threadId: cred?.threadId,
      }),
    )

    this.logger.log(`Credential revoked: ${cred.id}`)
  }

  // private methods
  // Method to create a revocation registry for a given credential definition
  private async createRevocationRegistry(
    credentialDefinitionId: string,
    maximumCredentialNumber: number = 1000,
  ): Promise<RevocationRegistryEntity> {
    const revocationDefinitionId = await this.apiClient.revocationRegistries.create({
      credentialDefinitionId,
      maximumCredentialNumber,
    })

    // Check if the revocation definition ID was successfully created
    if (!revocationDefinitionId)
      throw new Error(
        `Unable to create a new revocation registry for CredentialDefinitionId: ${credentialDefinitionId}`,
      )
    const revocationRegistry = await this.revocationRepository.save({
      credentialDefinitionId,
      revocationDefinitionId,
      currentIndex: 0,
      maximumCredentialNumber,
    })
    return revocationRegistry
  }

  private hash(value: string): string {
    return Buffer.from(new Sha256().hash(value)).toString('hex')
  }
}
