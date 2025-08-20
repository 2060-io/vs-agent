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
} from 'didwebvh-ts'

/**
 * Extension of the WebvhDidCrypto class implementing the Signer interface.
 * Provides cryptographic operations for DID documents using Ed25519 keys.
 */
export class WebvhDidCryptoExt extends WebvhDidCrypto implements Signer {
  private publicKeyMultibase: string
  private context: AgentContext
  public readonly supportedMethods: string[] = ['webvh']

  /**
   * Creates a new instance of WebvhDidCryptoExt.
   * @param context - The agent context containing wallet and configuration.
   * @param publicKeyMultibase - The public key encoded in multibase format.
   */
  constructor(context: AgentContext, publicKeyMultibase: string) {
    super(context)
    this.context = context
    this.publicKeyMultibase = publicKeyMultibase
  }

  /**
   * Gets the verification method identifier in DID:key format.
   * @returns The DID:key identifier as a string.
   */
  getVerificationMethodId(): string {
    return `did:key:${this.publicKeyMultibase}`
  }

  /**
   * Signs the provided input document using the Ed25519 secret key.
   * @param input - The signing input containing the document and proof.
   * @returns A promise that resolves to the signing output with the proof value.
   * @throws Error if the secret key is not found or signing fails.
   */
  async sign(input: SigningInput): Promise<SigningOutput> {
    try {
      const decoded = multibaseDecode(this.publicKeyMultibase).bytes
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
