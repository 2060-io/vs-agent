import {
  AnonCredsCredentialDefinition,
  AnonCredsRevocationRegistryDefinition,
  AnonCredsSchema,
  RegisterCredentialDefinitionOptions,
  RegisterCredentialDefinitionReturn,
  RegisterRevocationRegistryDefinitionOptions,
  RegisterRevocationRegistryDefinitionReturn,
  RegisterRevocationStatusListOptions,
  RegisterRevocationStatusListReturn,
  RegisterSchemaOptions,
  RegisterSchemaReturn,
} from '@credo-ts/anoncreds'
import { AgentContext, CredoError, DidRepository, TypedArrayEncoder } from '@credo-ts/core'
import { MultiBaseEncoder, MultiHashEncoder } from '@credo-ts/core/build/utils'
import { WebVhAnonCredsRegistry } from '@credo-ts/webvh'
import { canonicalize } from 'json-canonicalize'

import { EddsaJcs2022Cryptosuite, unsecuredDocument } from './eddsa-jcs-2022'

export type WebVhRegisterSchemaOptions = Omit<RegisterSchemaOptions, 'options'> & {
  options?: {
    verificationMethod?: string
  }
}

export class DidWebVhAnonCredsRegistrar extends WebVhAnonCredsRegistry {
  public async registerSchema(
    agentContext: AgentContext,
    options?: WebVhRegisterSchemaOptions,
  ): Promise<RegisterSchemaReturn> {
    if (!options?.schema) throw new CredoError('Schema options must be provided.')

    const resourceId = this.digestMultibase(canonicalize(options.schema))
    const schemaId = `${options.schema.issuerId}/resources/${resourceId}`

    const didRepository = agentContext.dependencyManager.resolve(DidRepository)
    const didRecord = await didRepository.findCreatedDid(agentContext, options.schema.issuerId)
    if (!didRecord) throw new CredoError(`No DID found for issuer ${options.schema.issuerId}`)

    const verificationMethod =
      options?.options?.verificationMethod ??
      (didRecord.didDocument?.verificationMethod?.[0]?.publicKeyMultibase
        ? didRecord.didDocument.verificationMethod[0].id
        : undefined)
    if (!verificationMethod) throw new CredoError(`No verification method found for DID ${didRecord.id}`)

    const registrationMetadata = await this.buildSignedResource(agentContext, {
      content: options.schema,
      id: schemaId,
      metadata: {
        resourceId,
        resourceType: 'anonCredsSchema',
        resourceName: options.schema.name,
      },
      verificationMethod,
    })

    return {
      schemaState: { state: 'finished', schema: options.schema, schemaId },
      registrationMetadata,
      schemaMetadata: {},
    }
  }

  public async registerCredentialDefinition(
    agentContext: AgentContext,
    options?: RegisterCredentialDefinitionOptions,
  ): Promise<RegisterCredentialDefinitionReturn> {
    if (!options?.credentialDefinition) throw new CredoError('credentialDefinition options must be provided.')

    const resourceId = this.digestMultibase(canonicalize(options.credentialDefinition))

    const credentialDefinitionId = `${options.credentialDefinition.issuerId}/resources/${resourceId}`

    return {
      credentialDefinitionState: {
        state: 'finished',
        credentialDefinition: options.credentialDefinition,
        credentialDefinitionId,
      },
      credentialDefinitionMetadata: {},
      registrationMetadata: {},
    }
  }

  public async registerRevocationRegistryDefinition(
    agentContext: AgentContext,
    options?: RegisterRevocationRegistryDefinitionOptions,
  ): Promise<RegisterRevocationRegistryDefinitionReturn> {
    if (!options?.revocationRegistryDefinition)
      throw new CredoError('credentialDefinition options must be provided.')

    // Nothing to actually do other than generating a revocation registry definition id
    const resourceId = this.digestMultibase(canonicalize(options.revocationRegistryDefinition))

    const revocationRegistryDefinitionId = `${options.revocationRegistryDefinition.issuerId}/resources/${resourceId}`

    return {
      revocationRegistryDefinitionState: {
        state: 'finished',
        revocationRegistryDefinition: options.revocationRegistryDefinition,
        revocationRegistryDefinitionId,
      },
      registrationMetadata: {},
      revocationRegistryDefinitionMetadata: {},
    }
  }

  public async registerRevocationStatusList(
    agentContext: AgentContext,
    options?: RegisterRevocationStatusListOptions,
  ): Promise<RegisterRevocationStatusListReturn> {
    if (!options?.revocationStatusList) throw new CredoError('revocationStatusList options must be provided.')

    // Nothing to actually do other than adding a timestamp
    const timestamp = Math.floor(new Date().getTime() / 1000)
    const latestRevocationStatusList = await this.getRevocationStatusList(
      agentContext,
      options.revocationStatusList.revRegDefId,
      timestamp,
    )

    return {
      revocationStatusListState: {
        state: 'finished',
        revocationStatusList: { ...options.revocationStatusList, timestamp },
      },
      registrationMetadata: {},
      revocationStatusListMetadata: {
        previousVersionId: latestRevocationStatusList.revocationStatusList?.timestamp.toString() || '',
        nextVersionId: '',
      },
    }
  }

  private digestMultibase(value: string) {
    const valueBytes = TypedArrayEncoder.fromString(value)
    const digestMultihash = MultiHashEncoder.encode(valueBytes, 'sha-256')
    const digestMultibase = MultiBaseEncoder.encode(digestMultihash, 'base58btc')
    return digestMultibase
  }

  public async createProof(
    agentContext: AgentContext,
    unsecuredDocument: unsecuredDocument,
    verificationMethod: string,
  ) {
    const cryptosuite = new EddsaJcs2022Cryptosuite(agentContext)
    try {
      const creationResult = await cryptosuite.createProof(unsecuredDocument, {
        type: 'DataIntegrityProof',
        cryptosuite: 'eddsa-jcs-2022',
        verificationMethod,
        proofPurpose: 'assertionMethod',
      })
      return creationResult
    } catch (error) {
      agentContext.config.logger.error('Error during proof creation of did:webvh resource', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    }
  }

  async buildSignedResource(
    agentContext: AgentContext,
    {
      content,
      id,
      metadata,
      verificationMethod,
      extra,
    }: {
      content: AnonCredsSchema | AnonCredsCredentialDefinition | AnonCredsRevocationRegistryDefinition
      id: string
      metadata: Record<string, unknown>
      verificationMethod: string
      extra?: Record<string, unknown>
    },
  ) {
    const resourcePayload = {
      '@context': [
        'https://opsecid.github.io/attested-resource/v1',
        'https://w3id.org/security/data-integrity/v2',
      ],
      type: ['AttestedResource'],
      id,
      content,
      metadata,
      ...(extra ?? {}),
    }

    const proof = await this.createProof(agentContext, resourcePayload, verificationMethod)
    return {
      ...resourcePayload,
      proof,
    }
  }
}
