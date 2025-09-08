import { RegisterCredentialDefinitionOptions, RegisterCredentialDefinitionReturn, RegisterRevocationRegistryDefinitionOptions, RegisterRevocationRegistryDefinitionReturn, RegisterRevocationStatusListOptions, RegisterRevocationStatusListReturn, RegisterSchemaOptions, RegisterSchemaReturn } from "@credo-ts/anoncreds";
import { AgentContext, CredoError, TypedArrayEncoder } from "@credo-ts/core";
import { MultiBaseEncoder, MultiHashEncoder } from "@credo-ts/core/build/utils";
import { WebVhAnonCredsRegistry } from "@credo-ts/webvh";
import { canonicalize } from 'json-canonicalize'

export class DidWebVhAnonCredsRegistrar extends WebVhAnonCredsRegistry {

  constructor(){ super() }

  public async registerSchema(agentContext: AgentContext, options?: RegisterSchemaOptions): Promise<RegisterSchemaReturn> {
    if (!options?.schema) throw new CredoError('Schema options must be provided.')
    
    const resourceId = this.digestMultibase(canonicalize(options.schema))

    const schemaId = `${options.schema.issuerId}/resources/${resourceId}`
    return {
      schemaState: { state: 'finished', schema: options.schema, schemaId },
      registrationMetadata: {},
      schemaMetadata: {},
    }
  }

  public async registerCredentialDefinition(agentContext: AgentContext, options?: RegisterCredentialDefinitionOptions): Promise<RegisterCredentialDefinitionReturn> {
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
    options?: RegisterRevocationRegistryDefinitionOptions
  ): Promise<RegisterRevocationRegistryDefinitionReturn> {
    if (!options?.revocationRegistryDefinition) throw new CredoError('credentialDefinition options must be provided.')

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

  public async registerRevocationStatusList(agentContext: AgentContext, options?: RegisterRevocationStatusListOptions): Promise<RegisterRevocationStatusListReturn> {
    if (!options?.revocationStatusList) throw new CredoError('revocationStatusList options must be provided.')

    // Nothing to actually do other than adding a timestamp
    const timestamp = Math.floor(new Date().getTime() / 1000)
    const latestRevocationStatusList = await this.getRevocationStatusList(
      agentContext,
      options.revocationStatusList.revRegDefId,
      timestamp
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
}