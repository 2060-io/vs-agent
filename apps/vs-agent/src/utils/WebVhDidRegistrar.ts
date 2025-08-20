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
import { WebvhDidCrypto } from '@credo-ts/webvh/build/dids'
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

import { WebvhDidCryptoSigner } from './WebvhDidCryptoSigner'

interface WebVhDidCreateOptions extends DidCreateOptions {
  domain: string
  endpoints: string[]
  signer: Signer
  verifier?: Verifier
  verificationMethods?: VerificationMethod[]
  paths?: string[]
  updateKeys?: string[]
  controller?: string
  context?: string | string[] | object | object[]
  alsoKnownAs?: string[]
  portable?: boolean
  nextKeyHashes?: string[]
  witness?: WitnessParameter | null
  watchers?: string[] | null
  created?: string
  authentication?: string[]
  assertionMethod?: string[]
  keyAgreement?: string[]
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

/**
 * DID Registrar implementation for the 'webvh' method.
 * Handles creation, update, and (future) deactivation of DIDs using the webvh method.
 */
export class WebVhDidRegistrar implements DidRegistrar {
  supportedMethods: string[] = ['webvh']

  /**
   * Updates an existing DID document and its log in the repository.
   * @param agentContext The agent context.
   * @param options The update options, including DID, log, signer, verifier, and services.
   * @returns The result of the DID update.
   */
  public async update(agentContext: AgentContext, options: WebVhDidUpdateOptions): Promise<DidUpdateResult> {
    try {
      const { did, domain, log, services } = options
      const didRepository = agentContext.dependencyManager.resolve(DidRepository)
      const [didRecord] = await didRepository.getCreatedDids(agentContext, { did, method: 'webvh' })
      const { controller, verificationMethod: verificationMethods } = log[0].state

      if (!verificationMethods || verificationMethods.length === 0) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: 'At least one verification method must be provided.',
          },
        }
      }

      // Always use parseCryptoInstance to get signer/verifier
      const { signer, verifier } = await this.parseCryptoInstance(
        agentContext,
        verificationMethods[0].publicKeyMultibase,
        {
          signer: options.signer,
          verifier: options.verifier,
        },
      )

      if (!signer || !verifier) {
        throw new Error(
          `No crypto instances available for DID: ${did}. Provide signer and verifier in options.`,
        )
      }

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
   * @param options The creation options, including domain, endpoints, controller, signer, and verifier.
   * @returns The result of the DID creation.
   */
  public async create(agentContext: AgentContext, options: WebVhDidCreateOptions): Promise<DidCreateResult> {
    try {
      const { domain, endpoints, controller } = options
      const didRepository = agentContext.dependencyManager.resolve(DidRepository)

      // Create crypto instance
      const publicKeyMultibase = await this.generatePublicKey(agentContext)
      const { signer, verifier } = await this.parseCryptoInstance(agentContext, publicKeyMultibase, options)

      // Create DID
      const { did, doc, log } = await createDID({
        domain,
        signer,
        updateKeys: [publicKeyMultibase],
        verificationMethods: [
          {
            controller: typeof controller === 'string' ? controller : String(controller?.[0]),
            type: 'Ed25519VerificationKey2018',
            publicKeyMultibase,
          },
        ],
        verifier,
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

      // Add default services if endpoints are provided
      if (endpoints && endpoints.length > 0) {
        return await this.update(agentContext, {
          did,
          didDocument,
          log,
          signer,
          verifier,
          domain,
          services: endpoints.map(
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
      }

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
   * Sets up crypto instances (signer/verifier) based on options or creates new ones.
   * @param agentContext The agent context.
   * @param publicKeyMultibase The public key in multibase format.
   * @param options Options containing signer and/or verifier.
   * @returns An object containing signer and verifier instances.
   */
  private async parseCryptoInstance(
    agentContext: AgentContext,
    publicKeyMultibase: string,
    options: { verifier?: Verifier; signer?: Signer } = {},
  ): Promise<{ signer: Signer; verifier: Verifier }> {
    const signer = options.signer ?? new WebvhDidCryptoSigner(agentContext, publicKeyMultibase)
    const verifier = options.verifier ?? new WebvhDidCrypto(agentContext)
    return { signer, verifier }
  }

  /**
   * Generates a new Ed25519 public key in multibase format and stores the private key in the wallet.
   * @param agentContext The agent context.
   * @returns The public key in multibase format.
   */
  private async generatePublicKey(agentContext: AgentContext): Promise<string> {
    const keyPair = crypto.generateKeyPair()
    const secret = multibaseEncode(new Uint8Array(keyPair.secretKey), MultibaseEncoding.BASE58_BTC)
    const key = await agentContext.wallet.createKey({
      privateKey: Buffer.from(multibaseDecode(secret).bytes.slice(2).slice(0, 32)),
      keyType: KeyType.Ed25519,
    })
    return multibaseEncode(new Uint8Array([0xed, 0x01, ...key.publicKey]), MultibaseEncoding.BASE58_BTC)
  }
}
