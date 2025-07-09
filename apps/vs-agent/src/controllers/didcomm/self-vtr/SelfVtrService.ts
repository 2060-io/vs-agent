import {
  W3cCredential,
  W3cPresentation,
  W3cCredentialSchema,
  DidRepository,
  ClaimFormat,
  JsonTransformer,
  VerificationMethod,
  W3cCredentialSubject,
  W3cJsonLdSignPresentationOptions,
  W3cJsonLdSignCredentialOptions,
} from '@credo-ts/core'
import { Injectable, Logger } from '@nestjs/common'
import { createHash } from 'crypto'

import { VsAgentService } from '../../../services/VsAgentService'
import { VsAgent } from '../../../utils/VsAgent'

@Injectable()
export class SelfVtrService {
  private readonly logger = new Logger(SelfVtrService.name)

  constructor(private readonly agentService: VsAgentService) {}

  public async generateVerifiableCredential(
    logTag: string,
    type: string[],
    subject: { id: string; claims?: any },
    credentialSchema: W3cCredentialSchema,
    presentation?: W3cPresentation,
  ): Promise<any> {
    const agent = await this.agentService.getAgent()
    const { id: subjectId } = subject
    let claims = subject.claims

    this.logger.log(`${logTag} VP requested`)

    if (!claims) {
      claims = await this.getClaims(agent, { id: subjectId }, logTag)
    }

    const unsignedCredential = new W3cCredential({
      context: ['https://www.w3.org/2018/credentials/v1', 'https://www.w3.org/2018/credentials/examples/v1'],
      id: agent.did,
      type,
      issuer: agent.did!,
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      credentialSubject: {
        id: subjectId,
        claims: presentation ? claims : await this.addDigestSRI(subjectId, claims),
      },
    })

    unsignedCredential.credentialSchema = presentation
      ? credentialSchema
      : await this.addDigestSRI(credentialSchema.id, credentialSchema)

    const didRepository = agent.context.dependencyManager.resolve(DidRepository)
    const verificationMethod = await didRepository.findCreatedDid(agent.context, agent.did ?? '')

    const signedCredential = await agent.w3cCredentials.signCredential({
      format: ClaimFormat.LdpVc,
      credential: unsignedCredential,
      proofType: 'Ed25519Signature2018',
      verificationMethod: JsonTransformer.fromJSON(
        verificationMethod?.didDocument?.verificationMethod?.[0],
        VerificationMethod,
      ).id,
      challenge: 'challenge',
      domain: 'example.com',
    } as W3cJsonLdSignCredentialOptions)

    if (presentation) {
      presentation.verifiableCredential = [signedCredential]
      const signedPresentation = await agent.w3cCredentials.signPresentation({
        format: ClaimFormat.LdpVp,
        presentation,
        proofType: 'Ed25519Signature2018',
        verificationMethod: JsonTransformer.fromJSON(
          verificationMethod?.didDocument?.verificationMethod?.[0],
          VerificationMethod,
        ).id,
        challenge: 'challenge',
        domain: 'example.com',
      } as W3cJsonLdSignPresentationOptions)
      return signedPresentation
    } else {
      return signedCredential.jsonCredential
    }
  }

  public async generateVerifiablePresentation(
    logTag: string,
    type: string[],
    credentialSchema: W3cCredentialSchema,
  ) {
    const agent = await this.agentService.getAgent()
    if (!agent.did) throw Error('The DID must be set up')
    const presentation = new W3cPresentation({
      context: ['https://www.w3.org/2018/credentials/v1'],
      id: agent.did,
      type: ['VerifiablePresentation'],
      holder: agent.did,
      verifiableCredential: [],
    })
    this.generateVerifiableCredential(logTag, type, { id: agent.did }, credentialSchema, presentation)
  }

  private async getClaims(agent: VsAgent, { id: subjectId }: W3cCredentialSubject, logTag: string) {
    const record = await agent.genericRecords.findById(`${subjectId}-${logTag}`)
    if (record?.content) return record.content

    if (logTag === 'ecs-service') {
      return {
        name: 'Health Portal',
        type: 'WEB_PORTAL',
        description: 'Some description',
        logo: 'base64string',
        minimumAgeRequired: 18,
        termsAndConditions: 'https://example.com/terms',
        termsAndConditionsHash: 'hash',
        privacyPolicy: 'https://example.com/privacy',
        privacyPolicyHash: 'hash',
      }
    }
    return {
      name: 'University Name',
      logo: 'base64string',
      registryId: 'ID-123',
      registryUrl: 'https://example.com/registry',
      address: 'Some address',
      type: 'PUBLIC',
      countryCode: 'CO',
    }
  }

  private async addDigestSRI<T extends object>(id?: string, data?: T): Promise<T & { digestSRI: string }> {
    if (!id || !data) {
      throw new Error(`id and data has requiered`)
    }
    const response = await fetch(id)
    if (!response.ok) {
      throw new Error(`Failed to fetch schema from ${id}: ${response.status} ${response.statusText}`)
    }
    const schemaContent = await response.text()
    return {
      ...data,
      digestSRI: this.generateDigestSRI(schemaContent),
    }
  }

  private generateDigestSRI(content: string, algorithm: string = 'sha256'): string {
    const hash = createHash(algorithm)
      .update(JSON.stringify(JSON.parse(content)), 'utf8')
      .digest('base64')
    return `${algorithm}-${hash}`
  }
}
