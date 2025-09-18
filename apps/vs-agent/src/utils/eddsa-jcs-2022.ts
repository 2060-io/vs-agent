import { type AgentContext, CredoError, Key, KeyType } from '@credo-ts/core'
import { DidsApi, Hasher, TypedArrayEncoder, Buffer } from '@credo-ts/core'
import { multibaseDecode, multibaseEncode, MultibaseEncoding } from 'didwebvh-ts'
import { canonicalize } from 'json-canonicalize'

export interface ProofOptions {
  type: string
  cryptosuite: string
  proofPurpose: string
  verificationMethod: string
}

export interface Proof {
  type: string
  cryptosuite: string
  proofPurpose: string
  verificationMethod: string
  proofValue: string
}

export interface unsecuredDocument {
  [key: string]: string | object
}

export class EddsaJcs2022Cryptosuite {
  didApi: DidsApi
  agentContext: AgentContext
  proofOptions: object = {
    type: 'DataIntegrityProof',
    cryptosuite: 'eddsa-jcs-2022',
  }
  constructor(agentContext: AgentContext) {
    this.agentContext = agentContext
    this.didApi = agentContext.dependencyManager.resolve(DidsApi)
  }

  public async _logError(error: string) {
    this.agentContext.config.logger.error(error)
  }

  public async _publicKeyFromId(verificationMethodId: string) {
    const didDocument = await this.didApi.resolveDidDocument(verificationMethodId)
    const verificationMethod = didDocument.dereferenceVerificationMethod(verificationMethodId)
    if (!verificationMethod.publicKeyMultibase) {
      const err = `Public key not found for ${verificationMethodId}`
      this._logError(err)
      throw new CredoError(err)
    }
    const decoded = multibaseDecode(verificationMethod.publicKeyMultibase).bytes
    return decoded
  }

  public transformation(unsecuredDocument: object, options: ProofOptions) {
    // https://www.w3.org/TR/vc-di-eddsa/#transformation-eddsa-jcs-2022
    if (options.type !== 'DataIntegrityProof') {
      const err = 'Proof type is not DataIntegrityProof'
      this._logError(err)
      throw new CredoError(err)
    }
    if (options.cryptosuite !== 'eddsa-jcs-2022') {
      const err = 'Cryptosuite is not eddsa-jcs-2022'
      this._logError(err)
      throw new CredoError(err)
    }
    const canonicalDocument = canonicalize(unsecuredDocument)
    return canonicalDocument
  }

  public proofConfiguration(proofOptions: ProofOptions) {
    // https://www.w3.org/TR/vc-di-eddsa/#proof-configuration-eddsa-jcs-2022
    const proofConfig = Object.assign({}, proofOptions)
    if (proofConfig.type !== 'DataIntegrityProof') {
      const err = 'Proof type is not DataIntegrityProof'
      this._logError(err)
      throw new CredoError(err)
    }
    if (proofConfig.cryptosuite !== 'eddsa-jcs-2022') {
      const err = 'Cryptosuite is not eddsa-jcs-2022'
      this._logError(err)
      throw new CredoError(err)
    }
    const canonicalProofConfig = canonicalize(proofConfig)
    return canonicalProofConfig
  }

  public hashing(transformedDocument: string, canonicalProofConfig: string) {
    // https://www.w3.org/TR/vc-di-eddsa/#hashing-eddsa-jcs-2022
    const transformedDocumentHash = Hasher.hash(TypedArrayEncoder.fromString(transformedDocument), 'sha-256')
    const proofConfigHash = Hasher.hash(TypedArrayEncoder.fromString(canonicalProofConfig), 'sha-256')
    const hashData = new Uint8Array(proofConfigHash.length + transformedDocumentHash.length)
    hashData.set(proofConfigHash, 0)
    hashData.set(transformedDocumentHash, proofConfigHash.length)
    return hashData
  }

  public async proofSerialization(hashData: Uint8Array, options: ProofOptions) {
    // https://www.w3.org/TR/vc-di-eddsa/#proof-serialization-eddsa-jcs-2022
    const decoded = await this._publicKeyFromId(options.verificationMethod)
    const key = Key.fromPublicKey(Buffer.from(decoded.slice(2).slice(0, 32)), KeyType.Ed25519)
    const proofBytes = await this.agentContext.wallet.sign({
      key,
      data: Buffer.from(hashData),
    })
    return proofBytes
  }

  async createProof(unsecuredDocument: unsecuredDocument, options: ProofOptions) {
    // https://www.w3.org/TR/vc-di-eddsa/#create-proof-eddsa-jcs-2022
    const proof: Proof = {
      ...options,
      proofValue: '',
    }
    const proofConfig = this.proofConfiguration(options)
    const transformedData = this.transformation(unsecuredDocument, options)
    const hashData = this.hashing(transformedData, proofConfig)
    const proofBytes = await this.proofSerialization(hashData, options)
    proof.proofValue = multibaseEncode(proofBytes, MultibaseEncoding.BASE58_BTC)
    return proof
  }
}
