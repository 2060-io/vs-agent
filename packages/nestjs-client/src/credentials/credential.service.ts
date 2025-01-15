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
  private name: string = 'Chatbot'
  private version: string = '1.0'
  private supportRevocation: boolean = false
  private maximumCredentialNumber: number = 1000
  private autoRevocationEnabled: boolean = false

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
   * Ensures the creation and initialization of a credential definition with support for revocation registries.
   *
   * When this method is called:
   * - Two default lists of possible revocation registries will be created. (only with supportRevocation)
   * - This guarantees seamless handling in case one of the registries runs out of revocation capacity. (only with supportRevocation)
   *
   * **Usage Recommendation:**
   * It is recommended to call this method inside an `OnModuleInit` lifecycle hook to validate the existence
   * of credentials as soon as the project is initialized.
   *
   * @param name - The name of the credential definition. Defaults to "Chatbot" if not provided.
   * @param version - The version of the credential definition. Defaults to "1.0" if not provided.
   * @param attributes - A list of attributes that the credential definition supports.
   * @param supportRevocation - Whether revocation is supported. Defaults to `false` if not provided.
   * @param maximumCredentialNumber - The maximum number of credentials. Defaults to `1000` if not provided.
   *
   * @returns A promise that resolves when the credential definition and revocation registries are created.
   */
  async create(
    attributes: string[],
    options: {
      name?: string
      version?: string
      supportRevocation?: boolean
      maximumCredentialNumber?: number
      autoRevocationEnabled?: boolean
    } = {},
  ) {
    const { name, version, supportRevocation, maximumCredentialNumber, autoRevocationEnabled } = options

    const [credential] = await this.apiClient.credentialTypes.getAll()
    if (name !== undefined) this.name = name
    if (version !== undefined) this.version = version
    if (supportRevocation !== undefined) this.supportRevocation = supportRevocation
    if (maximumCredentialNumber !== undefined) this.maximumCredentialNumber = maximumCredentialNumber
    if (autoRevocationEnabled !== undefined) this.autoRevocationEnabled = autoRevocationEnabled

    if (!credential) {
      const credential = await this.apiClient.credentialTypes.create({
        id: utils.uuid(),
        name: this.name,
        version: this.version,
        attributes,
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
  async issue(
    connectionId: string,
    claims: Claim[],
    options?: { identifier?: string },
  ): Promise<void> {
    const hashIdentifier = options?.identifier ? this.hashIdentifier(options.identifier) : null
    const credentials = await this.apiClient.credentialTypes.getAll()
    if (!credentials || credentials.length === 0) {
      throw new Error(
        'No credential definitions found. Please configure a credential using the create method before proceeding.',
      )
    }
    const [{ id: credentialDefinitionId }] = credentials

    const cred = await this.credentialRepository.findOne({
      where: {
        revoked: false,
        ...(hashIdentifier ? { hashIdentifier } : {}),
      },
    })
    if (cred && this.autoRevocationEnabled) {
      cred.connectionId = connectionId
      await this.credentialRepository.save(cred)
      await this.revoke(connectionId, { identifier: options?.identifier ?? undefined })
    }

    const { revocationRegistryDefinitionId, revocationRegistryIndex } = await this.entityManager.transaction(
      async transaction => {
        if (!this.supportRevocation) {
          await transaction.save(CredentialEntity, {
            connectionId,
            credentialDefinitionId,
            ...(hashIdentifier ? { hashIdentifier } : {}),
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
          ...(hashIdentifier ? { hashIdentifier } : {}),
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
    if (!cred) throw new Error(`Credencial with connectionId ${connectionId} not found.`)

    cred.threadId = threadId
    cred.revoked = true
    await this.credentialRepository.save(cred)
  }

  /**
   * Revokes a credential associated with the provided thread ID.
   * @param threadId - The thread ID linked to the credential to revoke.
   * @throws Error if no credential is found with the specified thread ID or if the credential has no connection ID.
   */
  async revoke(connectionId: string, options?: { identifier?: string }): Promise<void> {
    const hashIdentifier = options?.identifier ? this.hashIdentifier(options.identifier) : null
    const cred = await this.credentialRepository.findOne({
      where: { connectionId, revoked: false, ...(hashIdentifier ? { hashIdentifier } : {}) },
      order: { createdTs: 'DESC' },
    })
    if (!cred || !cred.connectionId) {
      throw new Error(`Credencial with connectionId ${connectionId} not found.`)
    }

    cred.revoked = true
    await this.credentialRepository.save(cred)
    this.supportRevocation &&
      (await this.apiClient.messages.send(
        new CredentialRevocationMessage({
          connectionId: cred.connectionId,
          threadId: cred?.threadId,
        }),
      ))
    this.logger.log(`Revoke Credential: ${cred.id}`)
  }

  // private methods
  private async createRevocationRegistry(credentialDefinitionId: string): Promise<string | null> {
    if (!this.supportRevocation) {
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

  private hashIdentifier(identifier: string): string {
    return Buffer.from(new Sha256().hash(identifier)).toString('hex')
  }
}
