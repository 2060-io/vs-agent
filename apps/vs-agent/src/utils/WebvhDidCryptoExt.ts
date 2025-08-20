import { AgentContext, Key, KeyType, Buffer } from '@credo-ts/core'
import * as crypto from '@stablelib/ed25519'
import {
  multibaseDecode,
  multibaseEncode,
  MultibaseEncoding,
  prepareDataForSigning,
  Signer,
  SigningInput,
  SigningOutput,
  Verifier,
} from 'didwebvh-ts'

/**
 * Extension of the WebvhDidCrypto class implementing the Signer and Verifier interfaces.
 * Provides cryptographic operations for DID documents using Ed25519 keys.
 */
export class WebvhDidCryptoExt implements Signer, Verifier {
  private publicKeyMultibase: string
  private agentContext: AgentContext
  public readonly supportedMethods: string[] = ['webvh']

  /**
   * Constructs a new instance of WebvhDidCryptoExt.
   * @param agentContext - The agent context containing wallet and configuration.
   * @param publicKeyMultibase - The public key encoded in multibase format.
   */
  constructor(agentContext: AgentContext, publicKeyMultibase: string) {
    this.agentContext = agentContext
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
      const signature = await this.agentContext.wallet.sign({
        key,
        data: Buffer.from(data),
      })
      return {
        proofValue: multibaseEncode(signature, MultibaseEncoding.BASE58_BTC),
      }
    } catch (error) {
      this.agentContext.config.logger.error('Ed25519 signing error:', error)
      throw error
    }
  }

  /**
   * Verifies a default signature for a given message and public key using Ed25519.
   * @param signature - The signature to verify.
   * @param message - The message that was signed.
   * @param publicKey - The public key to verify against.
   * @returns A promise that resolves to true if the signature is valid, false otherwise.
   */
  async verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
    try {
      return crypto.verify(publicKey, message, signature)
    } catch (error) {
      this.agentContext.config.logger.error('Error verifying signature:', error)
      return false
    }
  }
}
