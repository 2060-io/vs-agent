import {
  AgentContext,
  DidCreateResult,
  DidDeactivateOptions,
  DidDeactivateResult,
  DidRegistrar,
  DidUpdateOptions,
  DidUpdateResult,
} from '@credo-ts/core'
import { WebvhDidCrypto } from '@credo-ts/webvh/build/dids'
import * as crypto from '@stablelib/ed25519'
import {
  createDID,
  multibaseDecode,
  multibaseEncode,
  MultibaseEncoding,
  prepareDataForSigning,
  Signer,
  SigningInput,
  SigningOutput,
  VerificationMethod,
} from 'didwebvh-ts'

export class WebvhDidCryptoExt extends WebvhDidCrypto implements Signer {
  private verificationMethod: VerificationMethod
  public readonly supportedMethods: string[] = ['webvh']

  constructor(context: AgentContext, verificationMethod: VerificationMethod) {
    super(context)
    this.verificationMethod = verificationMethod
  }

  getVerificationMethodId(): string {
    return this.verificationMethod?.id ?? ''
  }

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
