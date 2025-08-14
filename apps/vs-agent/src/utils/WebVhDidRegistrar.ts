import {
  AgentContext,
  DidCreateResult,
  DidDeactivateOptions,
  DidDeactivateResult,
  DidDocument,
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
import { canonicalize } from 'json-canonicalize'
import { base58btc } from 'multiformats/bases/base58'
import { sha256 } from 'multiformats/hashes/sha2'

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

  /**
   * Creates a new DID document and saves it in the repository.
   * @param agentContext The agent context.
   * @returns The result of the DID creation.
   */
  public async create(agentContext: AgentContext): Promise<DidCreateResult> {
    try {
      const didRepository = agentContext.dependencyManager.resolve(DidRepository)
      const endpoints = agentContext.config.endpoints
      const domain = endpoints[0].split('//')[1]
      const baseMethod = await this.generateVerificationMethod(domain)
      const baseDocument = await this.registerDidDocument(baseMethod.id!, baseMethod)
      const entry = await createInitialEntry(baseDocument)
      const didDocument = new DidDocument(entry.state)

      const methods = didDocument.verificationMethod
      if (!methods || methods.length === 0) {
        return {
          didDocumentMetadata: {},
          didRegistrationMetadata: {},
          didState: {
            state: 'failed',
            reason: 'No verification method found in the DID document.',
          },
        }
      }

      const method = {
        ...methods[0],
        publicKeyMultibase: baseMethod.publicKeyMultibase,
        secretKeyMultibase: baseMethod.secretKeyMultibase,
      }

      // Create crypto instance
      const crypto = new WebvhDidCryptoExt(agentContext, method)

      // Create DID
      const didResult = await createDID({
        domain,
        signer: crypto,
        updateKeys: [method.publicKeyMultibase],
        verificationMethods: [method],
        verifier: crypto,
      })

      // Save didRegistry
      const didRecord = new DidRecord({
        did: entry.state.id,
        role: DidDocumentRole.Created,
        didDocument,
      })
      didRecord.metadata.set('log', didResult.log)
      await didRepository.save(agentContext, didRecord)

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

  /**
   * Generates a new verification method for the DID document.
   * @param domain The domain for the DID.
   * @param purpose The purpose of the verification method.
   * @returns The generated verification method.
   */
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
    const secretKeyMultibase = multibaseEncode(
      new Uint8Array([0x80, 0x26, ...keyPair.secretKey]),
      MultibaseEncoding.BASE58_BTC,
    )
    const publicKeyMultibase = multibaseEncode(
      new Uint8Array([0xed, 0x01, ...keyPair.publicKey]),
      MultibaseEncoding.BASE58_BTC,
    )
    return {
      id: `did:webvh:{SCID}:${domain}`,
      controller: `did:webvh:{SCID}:${domain}`,
      type: 'Ed25519VerificationKey2018',
      publicKeyMultibase,
      secretKeyMultibase,
      purpose,
    }
  }

  /**
   * Registers a DID document with the provided verification method.
   * @param agentContext The agent context.
   * @param did The DID identifier.
   * @param verificationMethod The verification method to add.
   * @returns The built DID document.
   */
  private async registerDidDocument(
    did: string,
    verificationMethod: VerificationMethod,
  ): Promise<DidDocument> {
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
      .addAuthentication(verificationMethod.id!)
    return builder.build()
  }
}

function nowIsoUtc(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Generates a base58-encoded SHA-256 hash of the canonicalized object.
 * @param obj The object to hash.
 * @returns The base58-encoded hash.
 */
async function generateBase58Hash(obj: any) {
  const jcs = canonicalize(obj)
  const mh = await sha256.digest(new TextEncoder().encode(jcs))
  return base58btc.baseEncode(mh.bytes)
}

/**
 * Creates the initial entry for the DID document, including versioning and hashing.
 * @param didDocument The DID document.
 * @returns The initial entry object.
 */
export async function createInitialEntry(didDocument: DidDocument) {
  // Base preLog object for did:webvh update transactions
  // This structure represents the initial state to be logged
  // whenever a DID document is created or updated
  const preLog = {
    versionId: '{SCID}',
    versionTime: nowIsoUtc(),
    parameters: {
      updateKeys: [didDocument.verificationMethod![0].publicKeyMultibase],
      method: 'did:webvh:1.0',
      scid: '{SCID}',
      portable: false,
      nextKeyHashes: [],
      witnesses: [],
      witnessThreshold: 0,
      deactivated: false,
    },
    state: didDocument.toJSON(),
  }

  const scid = await generateBase58Hash(preLog)
  const entryForHash = replaceSCID(preLog, scid)
  const entryHash = await generateBase58Hash(entryForHash)

  const entry = {
    ...entryForHash,
    versionId: `1-${entryHash}`,
  }

  return entry
}

/**
 * Replaces all occurrences of '{SCID}' in the object with the provided SCID value.
 * @param obj The object to process.
 * @param scid The SCID value to insert.
 * @returns The processed object with SCID replaced.
 */
function replaceSCID(obj: any, scid: string): any {
  const jsonStr = JSON.stringify(obj)
  const replacedStr = jsonStr.replace(/\{SCID\}/g, scid)
  return JSON.parse(replacedStr)
}
