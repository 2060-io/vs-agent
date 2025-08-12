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

export class WebVhDidRegistrar implements Signer, DidRegistrar {
  private verificationMethod: VerificationMethod = {} as VerificationMethod
  supportedMethods: string[] = ['webvh']

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(agentContext: AgentContext, options: DidUpdateOptions): Promise<DidUpdateResult> {
    throw new Error('Method not implemented.')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deactivate(agentContext: AgentContext, options: DidDeactivateOptions): Promise<DidDeactivateResult> {
    throw new Error('Method not implemented.')
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

  public async create(agentContext: AgentContext): Promise<DidCreateResult> {
    try {
      const endpoints = agentContext.config.endpoints
      const method = await this.generateVerificationMethod()

      const didResult = await createDID({
        domain: endpoints[0].split('//')[1],
        signer: this,
        updateKeys: [method.publicKeyMultibase],
        verificationMethods: [method],
        verifier: new WebvhDidCrypto(agentContext),
      })

      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'finished',
          did: didResult.did,
          didDocument: didResult.doc,
        },
      }
    } catch (error) {
      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error occurred.',
        },
      }
    }
  }

  private async generateVerificationMethod(
    purpose:
      | 'authentication'
      | 'assertionMethod'
      | 'keyAgreement'
      | 'capabilityInvocation'
      | 'capabilityDelegation' = 'authentication',
  ): Promise<VerificationMethod> {
    const keyPair = crypto.generateKeyPair()
    const secretKey = multibaseEncode(
      new Uint8Array([0x80, 0x26, ...keyPair.secretKey]),
      MultibaseEncoding.BASE58_BTC,
    )
    const publicKey = multibaseEncode(
      new Uint8Array([0xed, 0x01, ...keyPair.publicKey]),
      MultibaseEncoding.BASE58_BTC,
    )
    return {
      type: 'Multikey',
      publicKeyMultibase: publicKey,
      secretKeyMultibase: secretKey,
      purpose,
    }
  }
}
