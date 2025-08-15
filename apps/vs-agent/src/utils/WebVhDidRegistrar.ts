import {
  AgentContext,
  DidCreateOptions,
  DidCreateResult,
  DidDeactivateOptions,
  DidDeactivateResult,
  DidDocumentRole,
  DidRecord,
  DidRegistrar,
  DidRepository,
  DidUpdateOptions,
  DidUpdateResult,
  KeyType,
  Buffer,
} from '@credo-ts/core'
import * as crypto from '@stablelib/ed25519'
import {
  createDID,
  multibaseDecode,
  multibaseEncode,
  MultibaseEncoding,
  VerificationMethod,
} from 'didwebvh-ts'

import { WebvhDidCryptoExt } from './WebvhDidCryptoExt'

interface WebVhDidCreateOptions extends DidCreateOptions {
  domain: string
}

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

  /**
   * Creates a new DID document and saves it in the repository.
   * @param agentContext The agent context.
   * @returns The result of the DID creation.
   */
  public async create(agentContext: AgentContext, options: WebVhDidCreateOptions): Promise<DidCreateResult> {
    try {
      const { domain } = options
      const didRepository = agentContext.dependencyManager.resolve(DidRepository)
      const baseMethod = await this.generateVerificationMethod(agentContext, domain)

      // Create crypto instance
      const crypto = new WebvhDidCryptoExt(agentContext, baseMethod)
      // Create DID
      const {
        did,
        doc: didDocument,
        log,
      } = await createDID({
        domain,
        signer: crypto,
        updateKeys: [baseMethod.publicKeyMultibase],
        verificationMethods: [baseMethod],
        verifier: crypto,
      })

      // Save didRegistry
      const didRecord = new DidRecord({
        did,
        role: DidDocumentRole.Created,
        didDocument,
      })
      didRecord.metadata.set('log', log)
      await didRepository.save(agentContext, didRecord)

      return {
        didDocumentMetadata: {},
        didRegistrationMetadata: {},
        didState: {
          state: 'finished',
          did,
          didDocument,
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

  /**
   * Generates a new verification method for the DID document.
   * @param domain The domain for the DID.
   * @param purpose The purpose of the verification method.
   * @returns The generated verification method.
   */
  private async generateVerificationMethod(
    agentContext: AgentContext,
    domain: string,
    purpose:
      | 'authentication'
      | 'assertionMethod'
      | 'keyAgreement'
      | 'capabilityInvocation'
      | 'capabilityDelegation' = 'authentication',
  ): Promise<VerificationMethod> {
    const keyPair = crypto.generateKeyPair()
    const secret = multibaseEncode(new Uint8Array(keyPair.secretKey), MultibaseEncoding.BASE58_BTC)
    const key = await agentContext.wallet.createKey({
      privateKey: Buffer.from(multibaseDecode(secret).bytes.slice(0, 32)),
      keyType: KeyType.Ed25519,
    })

    return {
      id: `did:webvh:{SCID}:${domain}`,
      controller: `did:webvh:{SCID}:${domain}`,
      type: 'Ed25519VerificationKey2018',
      publicKeyMultibase: key.publicKey.toString('base64'),
      purpose,
    }
  }
}
