import { ApiClient, ApiVersion } from '@2060.io/service-agent-client'
import { Claim, CredentialIssuanceMessage, CredentialTypeInfo } from '@2060.io/service-agent-model'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { CredentialEntity } from './credential.entity'

@Injectable()
export class CredentialEventService {
  private readonly logger = new Logger(CredentialEventService.name)
  // private readonly url: string
  //   private readonly version: ApiVersion
  //   private readonly apiClient: ApiClient

  constructor(
    @InjectRepository(CredentialEntity)
    private readonly credentialRepository: Repository<CredentialEntity>,
  ) {
    // this.url = options.url
    // this.version = options.version
    // this.apiClient = new ApiClient(this.url, this.version)
  }

  /**
   * Creates a credential using the provided records.
   * This method requires a `CredentialTypeInfo` object with necessary parameters
   * such as the credential's name, version, and attributes.
   *
   * @param {CredentialTypeInfo} records - An object containing the attributes
   * of the credential to be created.
   *
   * Example of constructing the `records` object:
   * const records = {
   *   name: "Chabot",
   *   version: "1.0",
   *   attributes: ["email"]
   * };
   *
   * @returns {Promise<CredentialTypeInfo>} A promise that resolves when the credential is created successfully.
   */
  // async createCredential(records: CredentialTypeInfo): Promise<CredentialTypeInfo> {
  // const [credential] = await this.apiClient.credentialTypes.getAll()

  // if (!credential || credential.length === 0) {
  //   const newCredential = await this.apiClient.credentialTypes.create({
  //     id: records.id,
  //     name: records.name,
  //     version: records.version,
  //     attributes: records.attributes,
  //   })
  //   credential.push(newCredential)
  // }
  // return credential
  // }

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
  async sendCredentialIssuance(connectionId: string, records: Record<string, any>): Promise<void> {
    // const claims: Claim[] = []
    // if (records) {
    //   Object.entries(records).forEach(([key, value]) => {
    //     claims.push(
    //       new Claim({
    //         name: key,
    //         value: value ?? null,
    //       }),
    //     )
    //   })
    // }
    // let credentialId
    // let credential = (await this.apiClient.credentialTypes.getAll())[0]
    // if (!credential) credentialId = (await this.sendCredentialType())[0]?.id
    // await this.apiClient.messages.send(
    //   new CredentialIssuanceMessage({
    //     connectionId: connectionId,
    //     credentialDefinitionId: credentialId,
    //     claims: claims,
    //   }),
    // )
    // this.logger.debug('sendCredential with claims: ' + JSON.stringify(claims))
  }
}
