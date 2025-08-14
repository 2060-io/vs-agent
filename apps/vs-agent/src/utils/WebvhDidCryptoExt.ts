import { AgentContext } from '@credo-ts/core'
import { WebvhDidCrypto } from '@credo-ts/webvh/build/dids'
import * as crypto from '@stablelib/ed25519'
import {
  multibaseDecode,
  multibaseEncode,
  MultibaseEncoding,
  prepareDataForSigning,
  Signer,
  SigningInput,
  SigningOutput,
  VerificationMethod,
} from 'didwebvh-ts'

/**
 * Extended WebvhDidCrypto class implementing the Signer interface.
 * Provides cryptographic operations for DID documents using Ed25519.
 */
export class WebvhDidCryptoExt extends WebvhDidCrypto implements Signer {
  private verificationMethod: VerificationMethod
  public readonly supportedMethods: string[] = ['webvh']

  constructor(context: AgentContext, verificationMethod: VerificationMethod) {
    super(context)
    this.verificationMethod = verificationMethod
  }

  /**
   * Returns the verification method identifier in DID:key format.
   * @returns The DID:key identifier string.
   */
  getVerificationMethodId(): string {
    return `did:key:${this.verificationMethod.publicKeyMultibase}`
  }

  /**
   * Signs the provided input document using the Ed25519 secret key.
   * @param input - The signing input containing the document and proof.
   * @returns A promise resolving to the signing output with the proof value.
   * @throws Error if the secret key is not found or signing fails.
   */
  async sign(input: SigningInput): Promise<SigningOutput> {
    try {
      if (!this.verificationMethod?.secretKeyMultibase) {
        throw new Error('Secret key not found')
      }
      const { bytes: secretKey } = multibaseDecode(this.verificationMethod?.secretKeyMultibase)
      const proof = crypto.sign(secretKey.slice(2), await prepareDataForSigning(input.document, input.proof))
      return {
        proofValue: multibaseEncode(proof, MultibaseEncoding.BASE58_BTC),
      }
    } catch (error) {
      console.error('Ed25519 signing error:', error)
      throw error
    }
  }
}
