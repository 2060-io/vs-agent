import { AgentContext, DidRepository } from '@credo-ts/core'
import { createDID, multibaseDecode, multibaseEncode, MultibaseEncoding, prepareDataForSigning, Signer, SigningInput, SigningOutput, updateDID, VerificationMethod } from 'didwebvh-ts'
import * as crypto from '@stablelib/ed25519'
import { WebvhDidCrypto } from '@credo-ts/webvh/build/dids'
import { AGENT_PUBLIC_DID } from '../config'

export class WebVhDidRegistrar extends WebvhDidCrypto implements Signer {
  private context: AgentContext
  private verificationMethod: VerificationMethod = {} as VerificationMethod
  supportedMethods: string[] = ['webvh']

  public constructor(agentContext: AgentContext) {
    super(agentContext)
    this.context = agentContext
  }

  public async init() {
    const didRepository = this.context.dependencyManager.resolve(DidRepository)
    const didRecord = await didRepository.findCreatedDid(
      this.context,
      AGENT_PUBLIC_DID ?? ''
    )
    const method = didRecord?.didDocument?.verificationMethod?.[0]

    if (!method?.publicKeyBase58 && !method?.publicKeyBase64) {
      throw new Error('Not found')
    }

    this.verificationMethod = {
      ...method,
      publicKeyMultibase: (method.publicKeyBase58 ?? method.publicKeyBase64)!
    }
  }

  getVerificationMethodId(): string {
    return this.verificationMethod?.id ?? ''
  }

  public async update(method: VerificationMethod): Promise<void> {
    throw new Error('Method not implemented.')
  }

  public async deactivate(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async sign(input: SigningInput): Promise<SigningOutput> {
    try {
      if (!this.verificationMethod?.secretKeyMultibase) {
        throw new Error('Secret key not found');
      }
      const { bytes: secretKey } = multibaseDecode(this.verificationMethod?.secretKeyMultibase);
      const proof = crypto.sign(secretKey.slice(2), await prepareDataForSigning(input.document, input.proof));
      return {
        proofValue: multibaseEncode(proof, MultibaseEncoding.BASE58_BTC)
      };
    } catch (error) {
      console.error('Ed25519 signing error:', error);
      throw error;
    }
  }

  public async create(agentContext: AgentContext) {
    await this.init()
    const endpoints = agentContext.config.endpoints
    const authKey = await this.generateVerificationMethod()
    return await createDID({
      domain: endpoints[0].split('//')[1],
      signer: this,
      updateKeys: [authKey.publicKeyMultibase],
      verificationMethods: [authKey],
      verifier: this,
    })
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
