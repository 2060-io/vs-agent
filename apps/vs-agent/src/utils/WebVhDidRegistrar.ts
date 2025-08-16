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
  DidDocumentService,
  DidCommV1Service,
  DidDocument,
} from '@credo-ts/core'
import * as crypto from '@stablelib/ed25519'
import {
  createDID,
  DIDLog,
  multibaseDecode,
  multibaseEncode,
  MultibaseEncoding,
  Signer,
  updateDID,
  VerificationMethod,
  Verifier,
  WitnessParameter,
  WitnessProofFileEntry,
} from 'didwebvh-ts'

import { WebvhDidCryptoExt } from './WebvhDidCryptoExt'

interface WebVhDidCreateOptions extends DidCreateOptions {
  domain: string
}

interface WebVhDidUpdateOptions extends DidUpdateOptions {
  log: DIDLog
  signer: Signer
  services?: DidDocumentService[]
  domain?: string
  updated?: string
  updateKeys?: string[]
  verificationMethods?: VerificationMethod[]
  controller?: string
  context?: string | string[] | object | object[]
  alsoKnownAs?: string[]
  portable?: boolean
  nextKeyHashes?: string[]
  witness?: WitnessParameter | null
  watchers?: string[] | null
  verifier?: Verifier
  authentication?: string[]
  assertionMethod?: string[]
  keyAgreement?: string[]
  witnessProofs?: WitnessProofFileEntry[]
}

export class WebVhDidRegistrar implements DidRegistrar {
  supportedMethods: string[] = ['webvh']

  public async update(agentContext: AgentContext, options: WebVhDidUpdateOptions): Promise<DidUpdateResult> {
    try {
      const { did, domain, log, services, signer, verifier } = options
      const didRepository = agentContext.dependencyManager.resolve(DidRepository)
      const [didRecord] = await didRepository.getCreatedDids(agentContext, { did, method: 'webvh' })
      const { controller, verificationMethod: verificationMethods } = log[0].state
      const { log: logResult, doc } = await updateDID({
        log,
        signer,
        verifier,
        domain,
        verificationMethods,
        assertionMethod: [verificationMethods![0].id!],
        keyAgreement: [`${did}#key-agreement-1`],
        controller: Array.isArray(controller) ? controller[0] : controller,
        services,
      })

      const didDocument = new DidDocument(doc)
      didRecord.metadata.set('log', logResult)
      await didRepository.update(agentContext, didRecord)
      agentContext.config.logger.info('Public didWebVh record updated')

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
      const { did, doc, log } = await createDID({
        domain,
        signer: crypto,
        updateKeys: [baseMethod.publicKeyMultibase],
        verificationMethods: [baseMethod],
        verifier: crypto,
      })

      // Save didRegistry
      const didDocument = new DidDocument(doc)
      const didRecord = new DidRecord({
        did,
        role: DidDocumentRole.Created,
        didDocument,
      })
      didRecord.metadata.set('log', log)
      await didRepository.save(agentContext, didRecord)
      agentContext.config.logger.info('Public didWebVh record saved')

      // Add default services
      return await this.update(agentContext, {
        did,
        didDocument,
        log,
        signer: crypto,
        verifier: crypto,
        domain,
        services: agentContext.config.endpoints.map(
          (endpoint, i) =>
            new DidCommV1Service({
              id: `${did}#did-communication`,
              serviceEndpoint: endpoint,
              priority: i,
              routingKeys: [], // TODO: Support mediation
              recipientKeys: [`${did}#key-agreement-1`],
              accept: ['didcomm/aip2;env=rfc19'],
            }),
        ),
      })
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
      privateKey: Buffer.from(multibaseDecode(secret).bytes.slice(2).slice(0, 32)),
      keyType: KeyType.Ed25519,
    })

    return {
      id: `did:webvh:{SCID}:${domain}`,
      controller: `did:webvh:{SCID}:${domain}`,
      type: 'Ed25519VerificationKey2018',
      publicKeyMultibase: multibaseEncode(
        new Uint8Array([0xed, 0x01, ...key.publicKey]),
        MultibaseEncoding.BASE58_BTC,
      ),
      purpose,
    }
  }
}
