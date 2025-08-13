import {
  AgentContext,
  DidCreateResult,
  DidDeactivateOptions,
  DidDeactivateResult,
  DidDocumentBuilder,
  DidDocumentRole,
  DidRecord,
  DidRegistrar,
  DidRepository,
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
      await this.registerDidDocument(agentContext, crypto.getVerificationMethodId(), method)

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
      id: `did:webvh:${publicKey}:${domain}`,
      controller: `did:webvh:${publicKey}`,
      type: 'Ed25519VerificationKey2018',
      publicKeyMultibase: publicKey,
      secretKeyMultibase: secretKey,
      purpose,
    }
  }

  private async registerDidDocument(
    agentContext: AgentContext,
    did: string,
    verificationMethod: VerificationMethod,
  ): Promise<void> {
    const didRepository = agentContext.dependencyManager.resolve(DidRepository)
    const builder = new DidDocumentBuilder(did)
    builder
      .addContext('https://w3id.org/security/suites/ed25519-2018/v1')
      .addContext('https://w3id.org/security/suites/x25519-2019/v1')
      .addVerificationMethod({
        ...verificationMethod,
        id: verificationMethod.id!,
        controller: verificationMethod.controller!,
      })
      .addAssertionMethod(verificationMethod.id!)
    await didRepository.save(
      agentContext,
      new DidRecord({
        did,
        role: DidDocumentRole.Created,
        didDocument: builder.build(),
      }),
    )
  }
}
