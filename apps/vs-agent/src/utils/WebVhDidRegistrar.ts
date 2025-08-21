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
  DidDocument,
  VerificationMethod,
} from '@credo-ts/core'
import { WebvhDidCrypto } from '@credo-ts/webvh/build/dids'
import * as crypto from '@stablelib/ed25519'
import {
  createDID,
  multibaseDecode,
  multibaseEncode,
  MultibaseEncoding,
  Signer,
  updateDID,
  Verifier,
} from 'didwebvh-ts'

import { WebvhDidCryptoSigner } from './WebvhDidCryptoSigner'

interface WebVhDidCreateOptions extends DidCreateOptions {
  domain: string
  services?: DidDocumentService[]
}

interface WebVhDidUpdateOptions extends DidUpdateOptions {
  domain?: string
}

const normalizeMethodArray = (arr?: (string | { id: string })[]) =>
  arr?.map(item => (typeof item === 'string' ? item : item.id))

/**
 * DID Registrar implementation for the 'webvh' method.
 * Handles creation, update, and (future) deactivation of DIDs using the webvh method.
 */
export class WebVhDidRegistrar implements DidRegistrar {
  supportedMethods: string[] = ['webvh']

  /**
   * Updates an existing DID document and its log in the repository.
   * Uses internal logic to validate verification methods and handle errors.
   * @param agentContext The agent context.
   * @param options The update options, including DID, log, signer, verifier, and services.
   * @returns The result of the DID update, with error handling and validation.
   */
  public async update(agentContext: AgentContext, options: WebVhDidUpdateOptions): Promise<DidUpdateResult> {
    return this._update(agentContext, { ...options })
  }

  /**
   * Internal update logic for a DID document.
   * Handles validation, crypto instance setup, and repository update.
   * @param agentContext The agent context.
   * @param options The update options, including signer and verifier.
   * @returns The result of the DID update, with error handling.
   */
  private async _update(
    agentContext: AgentContext,
    options: WebVhDidUpdateOptions & { signer?: Signer; verifier?: Verifier },
  ): Promise<DidUpdateResult> {
    try {
      const { did, domain, didDocument: inputDidDocument } = options
      const didRepository = agentContext.dependencyManager.resolve(DidRepository)
      const [didRecord] = await didRepository.getCreatedDids(agentContext, { did, method: 'webvh' })
      const log = didRecord.metadata.get('log') as any[]
      if (!log) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: 'The log registry must be created before it can be edited',
          },
        }
      }

      const {
        controller,
        authentication,
        assertionMethod,
        keyAgreement,
        service,
        verificationMethod: inputVerificationMethod,
      } = inputDidDocument
      const verificationMethods =
        inputVerificationMethod ?? (log[log.length - 1].state.verificationMethod as VerificationMethod[])
      const updateKeys = log[log.length - 1].parameters.updateKeys
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
        verificationMethods[0].publicKeyMultibase!,
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
        updateKeys,
        ...inputDidDocument,
        verificationMethods: verificationMethods.map(vm => ({
          ...vm,
          publicKeyMultibase: vm.publicKeyMultibase!,
        })),
        controller: Array.isArray(controller) ? controller[0] : controller,
        authentication: normalizeMethodArray(authentication),
        assertionMethod: normalizeMethodArray(assertionMethod),
        keyAgreement: normalizeMethodArray(keyAgreement),
        services: service?.map(svc => JSON.parse(JSON.stringify(svc).replace(/{DID}/g, did))),
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
   * Handles crypto instance setup, DID creation, and error handling.
   * If services are provided, updates the DID document with those services.
   * @param agentContext The agent context.
   * @param options The creation options, including domain, endpoints, controller, signer, and verifier.
   * @returns The result of the DID creation, with error handling.
   */
  public async create(agentContext: AgentContext, options: WebVhDidCreateOptions): Promise<DidCreateResult> {
    try {
      const { domain, services } = options
      const didRepository = agentContext.dependencyManager.resolve(DidRepository)

      // Create crypto instance
      const publicKeyMultibase = await this.generatePublicKey(agentContext)
      const { signer, verifier } = await this.parseCryptoInstance(agentContext, publicKeyMultibase)

      // Create DID
      const { did, doc, log } = await createDID({
        domain,
        signer,
        updateKeys: [publicKeyMultibase],
        verificationMethods: [
          {
            controller: `did:webvh:{SCID}:${domain}`,
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

      // Add default services if are provided
      if (services && services.length > 0) {
        didDocument.service = services
        return await this._update(agentContext, {
          did,
          didDocument,
          signer,
          verifier,
          domain,
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
