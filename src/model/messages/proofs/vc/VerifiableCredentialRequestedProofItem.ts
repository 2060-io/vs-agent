import { utils } from '@credo-ts/core'

import { RequestedProofItem } from '../../IdentityProofRequestMessage'

export interface VerifiableCredentialRequestedProofItemOptions {
  id?: string
  description?: string
  credentialDefinitionId?: string
  attributes?: string[]
}

export class VerifiableCredentialRequestedProofItem extends RequestedProofItem {
  public readonly type = VerifiableCredentialRequestedProofItem.type
  public static readonly type = 'verifiable-credential'

  public description?: string

  public credentialDefinitionId?: string

  public attributes?: string[]

  public constructor(options: VerifiableCredentialRequestedProofItem) {
    super()
    if (options) {
      this.id = options.id ?? utils.uuid()
      this.description = options.description
      this.credentialDefinitionId = options.credentialDefinitionId
      this.attributes = options.attributes
    }
  }
}
