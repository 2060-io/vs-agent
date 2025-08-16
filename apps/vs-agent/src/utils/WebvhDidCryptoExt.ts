import { AgentContext, Key, KeyType, Buffer } from '@credo-ts/core'
import { WebvhDidCrypto } from '@credo-ts/webvh/build/dids'
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
  private context: AgentContext
  public readonly supportedMethods: string[] = ['webvh']

  constructor(context: AgentContext, verificationMethod: VerificationMethod) {
    super(context)
    this.context = context
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
      const decoded = multibaseDecode(this.verificationMethod.publicKeyMultibase).bytes
      const key = Key.fromPublicKey(Buffer.from(decoded.slice(2).slice(0, 32)), KeyType.Ed25519)
      const data = await prepareDataForSigning(input.document, input.proof)
      const signature = await this.context.wallet.sign({
        key,
        data: Buffer.from(data),
      })
      return {
        proofValue: multibaseEncode(signature, MultibaseEncoding.BASE58_BTC),
      }
    } catch (error) {
      this.context.config.logger.error('Ed25519 signing error:', error)
      throw error
    }
  }
}
