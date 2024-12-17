import {
  CredentialTypeInfo,
} from '@2060.io/service-agent-model'
import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from '@nestjs/typeorm'
import { CredentialEntity } from "./credential.entity"
import { Repository } from "typeorm"

@Injectable()
export class CredentialEventService {
  private readonly logger = new Logger(CredentialEventService.name)

  constructor(
    @InjectRepository(CredentialEntity)
    private readonly credentialRepository: Repository<CredentialEntity>,
  ) {}

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
  async CreateCredential(records: CredentialTypeInfo): Promise<void> {
  }
}

