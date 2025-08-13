import {
  AgentContext,
  DidCreateResult,
  DidDeactivateOptions,
  DidDeactivateResult,
  DidRegistrar,
  DidUpdateOptions,
  DidUpdateResult,
} from '@credo-ts/core'
import * as crypto from '@stablelib/ed25519'
import { createDID, multibaseEncode, MultibaseEncoding, VerificationMethod } from 'didwebvh-ts'

import { WebvhDidCryptoExt } from './WebvhDidCryptoExt'

export class WebVhDidRegistrar implements DidRegistrar {
  supportedMethods: string[] = ['webvh']

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(agentContext: AgentContext, options: DidUpdateOptions): Promise<DidUpdateResult> {
    throw new Error('Method not implemented.')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deactivate(agentContext: AgentContext, options: DidDeactivateOptions): Promise<DidDeactivateResult> {
    throw new Error('Method not implemented.')
  }

  public async create(agentContext: AgentContext): Promise<DidCreateResult> {
    try {
      const endpoints = agentContext.config.endpoints
      const domain = endpoints[0].split('//')[1]
      const method = await this.generateVerificationMethod(domain)
      const crypto = new WebvhDidCryptoExt(agentContext, method)

      console.log(crypto)
      const didResult = await createDID({
        domain,
        signer: crypto,
        updateKeys: [method.publicKeyMultibase],
        verificationMethods: [method],
        verifier: crypto,
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
    domain: string,
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
      id: `did:webvh:${publicKey}:${domain}#key-1`,
      controller: `did:webvh:${publicKey}`,
      type: 'Ed25519VerificationKey2018',
      publicKeyMultibase: publicKey,
      secretKeyMultibase: secretKey,
      purpose,
    }
  }
}
