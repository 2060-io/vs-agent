import { ProofItemResult } from '../../IdentityProofResultMessage'

export enum VerifiableCredentialResultCode {
  Ok = 'ok',
  Expired = 'error',
}

export interface VerifiableCredentialProofItemResultOptions {
  id: string
  code: VerifiableCredentialResultCode
  description: string
}

export class VerifiableCredentialProofItemResult extends ProofItemResult {
  public readonly type = VerifiableCredentialProofItemResult.type
  public static readonly type = 'verifiable-credential'

  public code!: VerifiableCredentialResultCode
  public description?: string

  public constructor(options: VerifiableCredentialProofItemResultOptions) {
    super()
    if (options) {
      this.id = options.id
      this.code = options.code
      this.description = options.description
    }
  }
}
