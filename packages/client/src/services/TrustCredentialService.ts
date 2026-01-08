// src/services/TrustCredentialService.ts

import { CredentialIssuanceRequest, CredentialIssuanceResponse } from '@2060.io/vs-agent-model'
import { Logger } from 'tslog'

import { ApiVersion } from '../types/enums'

const logger = new Logger({
  name: 'CredentialTypeService',
  type: 'pretty',
  prettyLogTemplate: '{{logLevelName}} [{{name}}]: ',
})

/**
 * Service responsible for managing verifiable credential issuance and revocation
 * through the Trust Credential API.
 *
 * This service interacts with the Verifiable Trust (VT) endpoint of the agent API
 * to issue credentials based on a given JSON schema and claim values.
 */
export class TrustCredentialService {
  private url: string

  constructor(
    private baseURL: string,
    private version: ApiVersion,
  ) {
    this.url = `${this.baseURL.replace(/\/$/, '')}/${this.version}/vt`
  }

  /**
   * Issues a verifiable credential (either W3C JSON-LD or Anoncreds) by sending
   * a POST request to the `/issue-credential` endpoint of the Trust Credential API.
   *
   * This method supports both `jsonld` and `anoncreds` credential formats.
   * It requires a JSON Schema credential definition and a set of claims,
   * optionally linked to a DID.
   *
   * @param type - The credential format. Accepted values: `'jsonld' | 'anoncreds'`.
   * @param jsonSchemaCredential - The URL of the credential JSON schema definition.
   * @param claims - A JSON object containing the credential claims.
   * @param did - (Optional) A decentralized identifier (DID) associated with the holder.
   *
   * @returns A `CredentialIssuanceResponse` containing either the DIDComm invitation URL
   *          or the issued verifiable credential, depending on the credential type.
   */
  public async issuance({
    format,
    jsonSchemaCredential,
    claims,
    did,
  }: CredentialIssuanceRequest): Promise<CredentialIssuanceResponse> {
    try {
      logger.info(`issue credential with schema: ${jsonSchemaCredential}`)
      const response = await fetch(`${this.url}/issue-credential`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          jsonSchemaCredential,
          claims,
          did,
        }),
      })

      if (!response.ok) {
        const responseText = await response.text()
        throw new Error(
          `Failed to issue credential.\n` +
            `Status: ${response.status} ${response.statusText}\n` +
            `Response body: ${responseText || 'No response body returned'}`,
        )
      }

      const data = (await response.json()) as CredentialIssuanceResponse
      logger.info('Credential issued successfully.')
      return data
    } catch (error) {
      logger.error(`Failed to send message: ${error}`)
      throw new Error('Failed to send message')
    }
  }

  // TODO: Implement revocation when the revocation method is supported.
  //       Update the NestJS client once the backend endpoint is available.
  public async revoke(): Promise<void> {
    throw new Error('This method is not implemented yet')
  }
}
