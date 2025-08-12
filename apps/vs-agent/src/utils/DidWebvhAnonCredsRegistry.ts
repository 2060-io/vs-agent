import {
  AnonCredsCredentialDefinition,
  AnonCredsRegistry,
  AnonCredsRevocationRegistryDefinition,
  AnonCredsRevocationStatusList,
  AnonCredsSchema,
  GetCredentialDefinitionReturn,
  GetRevocationRegistryDefinitionReturn,
  GetRevocationStatusListReturn,
  GetSchemaReturn,
  RegisterCredentialDefinitionOptions,
  RegisterCredentialDefinitionReturn,
  RegisterRevocationRegistryDefinitionOptions,
  RegisterRevocationRegistryDefinitionReturn,
  RegisterRevocationStatusListOptions,
  RegisterRevocationStatusListReturn,
  RegisterSchemaOptions,
  RegisterSchemaReturn,
} from '@credo-ts/anoncreds'
import { AgentContext, CacheModuleConfig, DidsApi, Hasher, parseDid, TypedArrayEncoder } from '@credo-ts/core'
import canonicalize from 'canonicalize'
import { parseUrl } from 'query-string'

export interface CacheSettings {
  allowCaching: boolean
  cacheDurationInSeconds: number
}

export interface AnonCredsResourceResolutionResult {
  resource: Record<string, unknown> | null
  resourceMetadata: Record<string, unknown>
}

export class DidWebvhAnonCredsRegistry implements AnonCredsRegistry {
  public readonly methodName = 'webvh'

  public readonly supportedIdentifier = /^did:webvh:[_a-z0-9.%A-]*/

  private cacheSettings: CacheSettings

  public constructor(options?: { cacheOptions?: CacheSettings }) {
    this.cacheSettings = options?.cacheOptions ?? { allowCaching: true, cacheDurationInSeconds: 300 }
  }

  public async getSchema(agentContext: AgentContext, schemaId: string): Promise<GetSchemaReturn> {
    const cacheKey = `anoncreds:schema:${schemaId}`

    if (this.cacheSettings.allowCaching) {
      const cache = agentContext.dependencyManager.resolve(CacheModuleConfig).cache

      const cachedObject = await cache.get<GetSchemaReturn>(agentContext, cacheKey)

      if (cachedObject) {
        return {
          schema: cachedObject.schema,
          schemaId,
          schemaMetadata: cachedObject.schemaMetadata,
          resolutionMetadata: {
            ...cachedObject.resolutionMetadata,
            servedFromCache: true,
          },
        }
      }
    }
    try {
      const { response, resourceId, did } = await this.parseIdAndFetchResource(agentContext, schemaId)

      if (response.status === 200) {
        const result = (await response.json()) as AnonCredsResourceResolutionResult
        const schema = result.resource as unknown as AnonCredsSchema
        const schemaMetadata = result.resourceMetadata
        if (!verifyResourceId(schema, resourceId)) {
          throw new Error('Wrong resource Id')
        }

        if (did !== schema.issuerId) {
          throw new Error(`issuerId in schema (${schema.issuerId}) does not match the did (${did})`)
        }

        if (this.cacheSettings.allowCaching) {
          const cache = agentContext.dependencyManager.resolve(CacheModuleConfig).cache
          await cache.set(
            agentContext,
            cacheKey,
            {
              resolutionMetadata: {},
              schema,
              schemaMetadata,
            },
            this.cacheSettings.cacheDurationInSeconds,
          )
        }

        return {
          schemaId,
          schema,
          schemaMetadata,
          resolutionMetadata: {},
        }
      } else {
        agentContext.config.logger.debug(`response: ${response.status}`)
        return {
          resolutionMetadata: { error: 'notFound' },
          schemaMetadata: {},
          schemaId,
        }
      }
    } catch (error) {
      agentContext.config.logger.debug(`Error resolving schema with id ${schemaId}: ${error}`, { error })
      return {
        resolutionMetadata: {
          error: 'invalid',
          message: error instanceof Error ? error.message : `${error}`,
        },
        schemaMetadata: {},
        schemaId,
      }
    }
  }

  public async registerSchema(
    agentContext: AgentContext,
    options: RegisterSchemaOptions,
  ): Promise<RegisterSchemaReturn> {
    // Nothing to actually do other than generating a schema id
    const resourceId = calculateResourceId(options.schema)

    const schemaId = `${options.schema.issuerId}?service=anoncreds&relativeRef=/schema/${resourceId}`
    return {
      schemaState: { state: 'finished', schema: options.schema, schemaId },
      registrationMetadata: {},
      schemaMetadata: {},
    }
  }

  public async getCredentialDefinition(
    agentContext: AgentContext,
    credentialDefinitionId: string,
  ): Promise<GetCredentialDefinitionReturn> {
    const cacheKey = `anoncreds:credentialDefinition:${credentialDefinitionId}`

    if (this.cacheSettings.allowCaching) {
      const cache = agentContext.dependencyManager.resolve(CacheModuleConfig).cache

      const cachedObject = await cache.get<GetCredentialDefinitionReturn>(agentContext, cacheKey)

      if (cachedObject) {
        return {
          credentialDefinition: cachedObject.credentialDefinition,
          credentialDefinitionId,
          credentialDefinitionMetadata: cachedObject.credentialDefinitionMetadata,
          resolutionMetadata: {
            ...cachedObject.resolutionMetadata,
            servedFromCache: true,
          },
        }
      }
    }

    try {
      const { response, resourceId, did } = await this.parseIdAndFetchResource(
        agentContext,
        credentialDefinitionId,
      )
      if (response.status === 200) {
        const result = (await response.json()) as AnonCredsResourceResolutionResult
        const credentialDefinition = result.resource as unknown as AnonCredsCredentialDefinition
        const credentialDefinitionMetadata = result.resourceMetadata

        if (!verifyResourceId(credentialDefinition, resourceId)) {
          throw new Error('Wrong resource Id')
        }

        if (did !== credentialDefinition.issuerId) {
          throw new Error(
            `issuerId in credential definition (${credentialDefinition.issuerId}) does not match the did (${did})`,
          )
        }

        if (this.cacheSettings.allowCaching) {
          const cache = agentContext.dependencyManager.resolve(CacheModuleConfig).cache
          await cache.set(
            agentContext,
            cacheKey,
            {
              resolutionMetadata: {},
              credentialDefinition,
              credentialDefinitionMetadata,
            },
            this.cacheSettings.cacheDurationInSeconds,
          )
        }

        return {
          credentialDefinitionId,
          credentialDefinition,
          credentialDefinitionMetadata,
          resolutionMetadata: {},
        }
      } else {
        agentContext.config.logger.debug(`response: ${response.status}`)
        return {
          resolutionMetadata: { error: 'notFound' },
          credentialDefinitionMetadata: {},
          credentialDefinitionId,
        }
      }
    } catch (error) {
      agentContext.config.logger.debug(`Error resolving schema with id ${credentialDefinitionId}: ${error}`, {
        error,
      })
      return {
        resolutionMetadata: {
          error: 'invalid',
          message: error instanceof Error ? error.message : `${error}`,
        },
        credentialDefinitionMetadata: {},
        credentialDefinitionId,
      }
    }
  }

  public async registerCredentialDefinition(
    agentContext: AgentContext,
    options: RegisterCredentialDefinitionOptions,
  ): Promise<RegisterCredentialDefinitionReturn> {
    // Nothing to actually do other than generating a credential definition id
    const resourceId = calculateResourceId(options.credentialDefinition)

    const credentialDefinitionId = `${options.credentialDefinition.issuerId}?service=anoncreds&relativeRef=/credDef/${resourceId}`

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

  public async getRevocationRegistryDefinition(
    agentContext: AgentContext,
    revocationRegistryDefinitionId: string,
  ): Promise<GetRevocationRegistryDefinitionReturn> {
    const cacheKey = `anoncreds:revocationRegistryDefinition:${revocationRegistryDefinitionId}`

    if (this.cacheSettings.allowCaching) {
      const cache = agentContext.dependencyManager.resolve(CacheModuleConfig).cache

      const cachedObject = await cache.get<GetRevocationRegistryDefinitionReturn>(agentContext, cacheKey)

      if (cachedObject) {
        return {
          revocationRegistryDefinition: cachedObject.revocationRegistryDefinition,
          revocationRegistryDefinitionId,
          revocationRegistryDefinitionMetadata: cachedObject.revocationRegistryDefinitionMetadata,
          resolutionMetadata: {
            ...cachedObject.resolutionMetadata,
            servedFromCache: true,
          },
        }
      }
    }

    try {
      const { response, resourceId, did } = await this.parseIdAndFetchResource(
        agentContext,
        revocationRegistryDefinitionId,
      )
      if (response.status === 200) {
        const result = (await response.json()) as AnonCredsResourceResolutionResult
        const revocationRegistryDefinition =
          result.resource as unknown as AnonCredsRevocationRegistryDefinition
        const revocationRegistryDefinitionMetadata = result.resourceMetadata

        if (!verifyResourceId(revocationRegistryDefinition, resourceId)) {
          throw new Error('Wrong resource Id')
        }

        if (did !== revocationRegistryDefinition.issuerId) {
          throw new Error(
            `issuerId in revocation registry definition (${revocationRegistryDefinition.issuerId}) does not match the did (${did})`,
          )
        }

        if (this.cacheSettings.allowCaching) {
          const cache = agentContext.dependencyManager.resolve(CacheModuleConfig).cache
          await cache.set(
            agentContext,
            cacheKey,
            {
              resolutionMetadata: {},
              revocationRegistryDefinition,
              revocationRegistryDefinitionMetadata,
            },
            this.cacheSettings.cacheDurationInSeconds,
          )
        }

        return {
          revocationRegistryDefinitionId,
          revocationRegistryDefinition,
          revocationRegistryDefinitionMetadata,
          resolutionMetadata: {},
        }
      } else {
        agentContext.config.logger.debug(`response: ${response.status}`)
        return {
          resolutionMetadata: { error: 'notFound' },
          revocationRegistryDefinitionMetadata: {},
          revocationRegistryDefinitionId,
        }
      }
    } catch (error) {
      agentContext.config.logger.debug(
        `Error resolving schema with id ${revocationRegistryDefinitionId}: ${error}`,
        {
          error,
        },
      )
      return {
        resolutionMetadata: {
          error: 'invalid',
          message: error instanceof Error ? error.message : `${error}`,
        },
        revocationRegistryDefinitionMetadata: {},
        revocationRegistryDefinitionId,
      }
    }
  }

  public async registerRevocationRegistryDefinition(
    agentContext: AgentContext,
    options: RegisterRevocationRegistryDefinitionOptions,
  ): Promise<RegisterRevocationRegistryDefinitionReturn> {
    // Nothing to actually do other than generating a revocation registry definition id
    const resourceId = calculateResourceId(options.revocationRegistryDefinition)

    const revocationRegistryDefinitionId = `${options.revocationRegistryDefinition.issuerId}?service=anoncreds&relativeRef=/revRegDef/${resourceId}`

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

  public async getRevocationStatusList(
    agentContext: AgentContext,
    revocationRegistryId: string,
    timestamp: number,
  ): Promise<GetRevocationStatusListReturn> {
    try {
      // TODO: use cache to get Revocation Registry Definition data without fetching it again
      const revRegDefResult = await this.getRevocationRegistryDefinition(agentContext, revocationRegistryId)
      if (!revRegDefResult.revocationRegistryDefinition) {
        throw new Error(
          `Error resolving revocation registry definition with id ${revocationRegistryId}. ${revRegDefResult.resolutionMetadata.error} ${revRegDefResult.resolutionMetadata.message}`,
        )
      }

      const baseEndpoint = revRegDefResult.revocationRegistryDefinitionMetadata.statusListEndpoint

      if (!baseEndpoint) {
        throw new Error(`No revocation status list endpoint has been found for ${revocationRegistryId}`)
      }

      const response = await agentContext.config.agentDependencies.fetch(`${baseEndpoint}/${timestamp}`, {
        method: 'GET',
      })

      if (response.status === 200) {
        const result = (await response.json()) as AnonCredsResourceResolutionResult
        const revocationStatusList = result.resource as unknown as AnonCredsRevocationStatusList
        const revocationStatusListMetadata = result.resourceMetadata

        if (revocationStatusList.issuerId !== revRegDefResult.revocationRegistryDefinition.issuerId) {
          throw new Error(
            `issuerId in revocation status list (${revocationStatusList.issuerId}) does not match the issuer in the revocation registry definition (${revRegDefResult.revocationRegistryDefinition.issuerId})`,
          )
        }

        return {
          revocationStatusList,
          revocationStatusListMetadata,
          resolutionMetadata: {},
        }
      } else {
        agentContext.config.logger.debug(`response: ${response.status}`)
        return {
          resolutionMetadata: { error: 'notFound' },
          revocationStatusListMetadata: {},
        }
      }
    } catch (error) {
      return {
        resolutionMetadata: { error: 'invalid' },
        revocationStatusListMetadata: {},
      }
    }
  }

  public async registerRevocationStatusList(
    agentContext: AgentContext,
    options: RegisterRevocationStatusListOptions,
  ): Promise<RegisterRevocationStatusListReturn> {
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

  private async parseIdAndFetchResource(agentContext: AgentContext, didUrl: string) {
    const parsedDid = parseDid(didUrl)

    if (!parsedDid) {
      throw new Error(`${didUrl} is not a valid resource identifier`)
    }

    if (parsedDid.method != 'webvh') {
      throw new Error('DidWebvhAnonCredsRegistry only supports did:webvh identifiers')
    }

    const didsApi = agentContext.dependencyManager.resolve(DidsApi)
    const didDocument = await didsApi.resolveDidDocument(parsedDid.did)

    const parsedUrl = parseUrl(didUrl)
    const queriedService = parsedUrl.query['service']
    const relativeRef = parsedUrl.query['relativeRef']

    if (!queriedService || Array.isArray(queriedService)) {
      throw new Error('No valid service query present in the ID')
    }

    if (!relativeRef || Array.isArray(relativeRef)) {
      throw new Error('No valid relativeRef query present in the ID')
    }

    // The last segment of relativeRef is the resourceId
    const resourceId = relativeRef.split('/').pop()

    if (!resourceId) {
      throw new Error('Could not get resourceId from relativeRef')
    }

    const baseEndpoint = didDocument.service?.find(
      service => service.id === `${parsedDid.did}#${queriedService}`,
    )?.serviceEndpoint

    if (!baseEndpoint) {
      throw new Error(`No valid endpoint has been found for the service ${queriedService}`)
    }

    const fetchResourceUrl = `${baseEndpoint}${relativeRef}`
    agentContext.config.logger.debug(`getting AnonCreds resource at URL: ${fetchResourceUrl}`)
    return {
      response: await agentContext.config.agentDependencies.fetch(fetchResourceUrl, { method: 'GET' }),
      resourceId,
      did: parsedDid.did,
    }
  }
}

export function calculateResourceId(resourceObjectValue: unknown) {
  const objectString = canonicalize(resourceObjectValue)

  if (!objectString) {
    throw new Error('Cannot canonicalize resource object')
  }

  return TypedArrayEncoder.toBase58(Hasher.hash(TypedArrayEncoder.fromString(objectString), 'sha-256'))
}

export function verifyResourceId(resourceObjectValue: unknown, resourceId: string) {
  return calculateResourceId(resourceObjectValue) === resourceId
}
