import {
  W3cCredential,
  W3cPresentation,
  W3cCredentialSchema,
  DidRepository,
  ClaimFormat,
  W3cCredentialSubject,
  W3cJsonLdVerifiableCredential,
  W3cJsonLdVerifiablePresentation,
  W3cCredentialOptions,
  DidRecord,
  W3cPresentationOptions,
} from '@credo-ts/core'
// No type definitions available for this library
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import { purposes } from '@digitalcredentials/jsonld-signatures'
import Ajv, { AnySchemaObject } from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import axios, { isAxiosError } from 'axios'
import { createHash } from 'crypto'

import {
  AGENT_LABEL,
  SELF_ISSUED_VTC_SERVICE_TYPE,
  SELF_ISSUED_VTC_SERVICE_DESCRIPTION,
  AGENT_INVITATION_IMAGE_URL,
  SELF_ISSUED_VTC_SERVICE_MINIMUMAGEREQUIRED,
  SELF_ISSUED_VTC_SERVICE_TERMSANDCONDITIONS,
  SELF_ISSUED_VTC_SERVICE_PRIVACYPOLICY,
  SELF_ISSUED_VTC_ORG_REGISTRYID,
  SELF_ISSUED_VTC_ORG_REGISTRYURL,
  SELF_ISSUED_VTC_ORG_ADDRESS,
  SELF_ISSUED_VTC_ORG_TYPE,
  SELF_ISSUED_VTC_ORG_COUNTRYCODE,
  FALLBACK_BASE64,
} from '../config'

import { VsAgent } from './VsAgent'
import { getEcsSchemas } from './data'

const ajv = new Ajv({ strict: false })
addFormats(ajv)

export const presentations = [
  {
    name: 'ecs-service',
    schemaUrl: `ecosystem/schemas-example-service-jsc.json`,
  },
  {
    name: 'ecs-org',
    schemaUrl: `ecosystem/schemas-example-org-jsc.json`,
  },
]

export const credentials = [
  {
    name: 'example-service',
    credUrl: `ecosystem/cs/v1/js/ecs-service`,
    schemaUrl: `ecosystem/schemas-example-service-jsc.json`,
  },
  {
    name: 'example-org',
    credUrl: `ecosystem/cs/v1/js/ecs-org`,
    schemaUrl: `ecosystem/schemas-example-org-jsc.json`,
  },
]

// Default JSON Schema objects
export const createJsonSchema: W3cCredentialSchema = {
  id: 'https://www.w3.org/ns/credentials/json-schema/v2.json',
  type: 'JsonSchema',
}

export const createJsonSubjectRef = (id: string): W3cCredentialSubject => ({
  id,
  claims: {
    type: 'JsonSchema',
    jsonSchema: {
      $ref: id,
    },
  },
})

export const mapToSelfTr = (url: string, publicApiBaseUrl: string): string =>
  url.replace('ecosystem', `${publicApiBaseUrl}/self-tr`)

export const setupSelfTr = async ({
  agent,
  publicApiBaseUrl,
}: {
  agent: VsAgent
  publicApiBaseUrl: string
}) => {
  const ecsSchemas = getEcsSchemas(publicApiBaseUrl)

  for (const { name, schemaUrl } of presentations) {
    await generateVerifiablePresentation(
      agent,
      ecsSchemas,
      name,
      ['VerifiableCredential', 'VerifiableTrustCredential'],
      {
        id: mapToSelfTr(schemaUrl, publicApiBaseUrl),
        type: 'JsonSchemaCredential',
      },
    )
  }

  for (const { name, credUrl, schemaUrl } of credentials) {
    const id = mapToSelfTr(schemaUrl, publicApiBaseUrl)
    const ref = mapToSelfTr(credUrl, publicApiBaseUrl)
    await generateVerifiableCredential(
      agent,
      id,
      ecsSchemas,
      name,
      ['VerifiableCredential', 'JsonSchemaCredential'],
      createJsonSubjectRef(ref),
      createJsonSchema,
    )
  }
}

/**
 * Generates and signs a verifiable credential using the agent's DID.
 * Stores the signed credential and its integrity metadata in the DID record.
 *
 * - If the claims for the subject are not provided, they are retrieved (default claims) and validated against the schema.
 * - The integrity of the claims is tracked using a Subresource Integrity (SRI) digest.
 * - If a credential with the same integrity already exists in the DID metadata, it is returned directly.
 * - Otherwise, a new credential is created, signed, and stored in the DID metadata.
 * - If a presentation is provided, the signed credential is embedded and a signed presentation is returned.
 *
 * @param agent - The VsAgent instance used for signing and DID management.
 * @param logger - Logger instance for logging operations.
 * @param ecsSchemas - Map of ECS schemas for validation.
 * @param logTag - Unique identifier for the credential type and metadata key.
 * @param type - Array of credential types (e.g., ['VerifiableCredential']).
 * @param subject - Subject information, including ID and optional claims.
 * @param credentialSchema - Schema definition for the credential.
 * @param presentation - Optional presentation to include the credential.
 * @returns The signed verifiable credential or presentation, with integrity metadata.
 */
async function generateVerifiableCredential(
  agent: VsAgent,
  id: string,
  ecsSchemas: Record<string, AnySchemaObject>,
  logTag: string,
  type: string[],
  subject: W3cCredentialSubject,
  credentialSchema: W3cCredentialSchema,
  presentation?: W3cPresentation,
): Promise<any> {
  const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })

  const { id: subjectId } = subject
  let claims = subject.claims

  if (!claims) {
    claims = await getClaims(ecsSchemas, { id: subjectId }, logTag)
  }
  const integrityData = generateDigestSRI(JSON.stringify(claims))
  const metadata = didRecord.metadata.get(logTag)
  if (metadata?.integrityData === integrityData) return metadata

  const unsignedCredential = createCredential({
    id,
    type,
    issuer: agent.did,
    credentialSubject: {
      id: subjectId,
      claims: presentation ? claims : await addDigestSRI(subjectId, claims, ecsSchemas),
    },
  })

  unsignedCredential.credentialSchema = presentation
    ? credentialSchema
    : await addDigestSRI(credentialSchema.id, credentialSchema, ecsSchemas)

  // Note: this is dependant on DIDComm invitation keys. Not sure if it is fine or we should use a dedicated
  // key for this feature
  const verificationMethodId = getVerificationMethodId(didRecord)

  const signedCredential = await signerW3c(agent, unsignedCredential, verificationMethodId)
  if (presentation) {
    presentation.verifiableCredential = [signedCredential]
    return await signerW3c(agent, presentation, verificationMethodId)
  } else {
    didRecord.metadata.set(logTag, { ...signedCredential.jsonCredential, integrityData })
    await agent.context.dependencyManager.resolve(DidRepository).update(agent.context, didRecord)
    return signedCredential.jsonCredential
  }
}

export function createCredential(options: Partial<W3cCredentialOptions>) {
  options.context ??= [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.w3.org/2018/credentials/examples/v1',
  ]

  options.issuanceDate ??= new Date().toISOString()
  options.expirationDate ??= new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString()

  return new W3cCredential(options as W3cCredentialOptions)
}

/**
 * Signs a W3C Verifiable Credential or Presentation using the provided agent and verification method.
 *
 * The function determines whether the input object is a `W3cCredential` or a `W3cPresentation`,
 * and applies the appropriate signing operation using Linked Data Proofs (`Ed25519Signature2020`).
 *
 * @param agent - The agent instance.
 * @param obj - The credential or presentation object to be signed.
 * @param verificationMethod - The DID verification method used to generate the proof.
 * @returns A signed W3C Verifiable Credential or Presentation in JSON-LD format.
 */
export async function signerW3c(
  agent: VsAgent,
  obj: W3cCredential,
  verificationMethod: string,
): Promise<W3cJsonLdVerifiableCredential>

export async function signerW3c(
  agent: VsAgent,
  obj: W3cPresentation,
  verificationMethod: string,
): Promise<W3cJsonLdVerifiablePresentation>

export async function signerW3c(
  agent: VsAgent,
  obj: W3cCredential | W3cPresentation,
  verificationMethod: string,
) {
  const proofPurpose = new purposes.AssertionProofPurpose()

  if (obj instanceof W3cCredential) {
    return await agent.w3cCredentials.signCredential({
      format: ClaimFormat.LdpVc,
      credential: obj,
      proofType: 'Ed25519Signature2020',
      verificationMethod,
      proofPurpose,
    })
  }

  if (obj instanceof W3cPresentation) {
    return await agent.w3cCredentials.signPresentation({
      format: ClaimFormat.LdpVp,
      presentation: obj,
      proofType: 'Ed25519Signature2020',
      verificationMethod,
      proofPurpose,
    })
  }
}

/**
 * Generates and signs a verifiable presentation containing a verifiable credential.
 * Stores the signed presentation and its integrity metadata in the DID record.
 *
 * - Retrieves and validates claims for the agent's DID.
 * - Computes an integrity digest for the claims.
 * - If a presentation with the same integrity already exists in the DID metadata, it is returned.
 * - Otherwise, a new presentation is created, signed, and stored in the DID metadata.
 *
 * @param agent - The VsAgent instance used for signing and DID management.
 * @param logger - Logger instance for logging operations.
 * @param ecsSchemas - Map of ECS schemas for validation.
 * @param logTag - Unique identifier for the presentation type and metadata key.
 * @param type - Array of credential types to include.
 * @param credentialSchema - Schema definition for the credential.
 * @returns The signed verifiable presentation, with integrity metadata.
 */
export async function generateVerifiablePresentation(
  agent: VsAgent,
  ecsSchemas: Record<string, AnySchemaObject>,
  logTag: string,
  type: string[],
  credentialSchema: W3cCredentialSchema,
) {
  if (!agent.did) throw Error('The DID must be set up')
  const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })
  const integrityData = generateDigestSRI(
    JSON.stringify(await getClaims(ecsSchemas, { id: agent.did }, logTag)),
  )
  const metadata = didRecord.metadata.get(logTag)
  if (metadata?.integrityData === integrityData) return metadata

  const presentation = createPresentation({
    id: agent.did,
    holder: agent.did,
    verifiableCredential: [],
  })
  const result = await generateVerifiableCredential(
    agent,
    agent.did,
    ecsSchemas,
    logTag,
    type,
    { id: agent.did },
    credentialSchema,
    presentation,
  )
  didRecord.metadata.set(logTag, { ...result, integrityData })
  await agent.context.dependencyManager.resolve(DidRepository).update(agent.context, didRecord)
  return result
}

export function createPresentation(options: Partial<W3cPresentationOptions>) {
  options.context ??= ['https://www.w3.org/2018/credentials/v1']
  options.type ??= ['VerifiablePresentation']
  return new W3cPresentation(options as W3cPresentationOptions)
}

/**
 * Retrieves and validates claims for a credential subject.
 * If claims are not found, builds default claims based on the logTag.
 * Validates claims against the ECS schema for the given logTag.
 *
 * @param ecsSchemas - Map of ECS schemas for validation.
 * @param subject - Credential subject, including ID.
 * @param logTag - Unique identifier for the credential type.
 * @returns The validated claims object.
 * @throws If claims are invalid or schema is missing.
 */
export async function getClaims(
  ecsSchemas: Record<string, AnySchemaObject>,
  { id, claims }: W3cCredentialSubject,
  logTag: string,
) {
  // Default claims fallback
  claims =
    logTag === 'ecs-service'
      ? {
          name: claims?.name ?? AGENT_LABEL,
          type: claims?.type ?? SELF_ISSUED_VTC_SERVICE_TYPE,
          description: claims?.description ?? SELF_ISSUED_VTC_SERVICE_DESCRIPTION,
          logo: await urlToBase64((claims?.logo as string) ?? AGENT_INVITATION_IMAGE_URL),
          minimumAgeRequired: claims?.minimumAgeRequired ?? SELF_ISSUED_VTC_SERVICE_MINIMUMAGEREQUIRED,
          termsAndConditions: claims?.termsAndConditions ?? SELF_ISSUED_VTC_SERVICE_TERMSANDCONDITIONS,
          privacyPolicy: claims?.privacyPolicy ?? SELF_ISSUED_VTC_SERVICE_PRIVACYPOLICY,
        }
      : {
          name: claims?.name ?? AGENT_LABEL,
          logo: await urlToBase64((claims?.logo as string) ?? AGENT_INVITATION_IMAGE_URL),
          registryId: claims?.registryId ?? SELF_ISSUED_VTC_ORG_REGISTRYID,
          registryUrl: claims?.registryUrl ?? SELF_ISSUED_VTC_ORG_REGISTRYURL,
          address: claims?.address ?? SELF_ISSUED_VTC_ORG_ADDRESS,
          type: claims?.type ?? SELF_ISSUED_VTC_ORG_TYPE,
          countryCode: claims?.countryCode ?? SELF_ISSUED_VTC_ORG_COUNTRYCODE,
        }

  const ecsSchema = ecsSchemas[logTag]
  if (!ecsSchema) {
    throw new Error(`Schema not defined in data schemas for logTag: ${logTag}`)
  }

  const validate = ajv.compile(ecsSchema.properties?.credentialSubject)
  const credentialSubject = { id, ...claims }
  const isValid = validate(credentialSubject)

  if (!isValid) {
    const errorDetails = validate.errors?.map(e => ({
      message: e.message,
      path: e.instancePath,
      keyword: e.keyword,
      params: e.params,
    }))
    console.error(`Validation failed for ${logTag}`, errorDetails)
    throw new Error(`Invalid claims for ${logTag}: ${JSON.stringify(errorDetails, null, 2)}`)
  }

  return claims
}

/**
 * Adds a Subresource Integrity (SRI) digest to the provided data using the schema content
 * fetched from the provided URL or from a local schema map as fallback.
 *
 * @template T - The type of the data object.
 * @param id - The URL of the schema to fetch.
 * @param data - The object to which the digest will be added.
 * @param ecsSchemas - Optional map of local schemas to use as fallback if the fetch fails.
 * @returns A new object combining the original data and a `digestSRI` property.
 * @throws Error if both the fetch and local fallback fail.
 */
export async function addDigestSRI<T extends object>(
  id?: string,
  data?: T,
  ecsSchemas?: Record<string, AnySchemaObject>,
): Promise<T & { digestSRI: string }> {
  if (!id || !data) {
    throw new Error(`id and data has requiered`)
  }
  const response = await fetch(id)
  const key = id.split('/').pop()
  const fallbackSchema = key && ecsSchemas?.[key]

  if (!response.ok && !fallbackSchema) {
    throw new Error(
      `Failed to fetch schema from ${id}: ${response.status} ${response.statusText}, and no local fallback found.`,
    )
  }

  let schemaContent: string

  if (response.ok) {
    schemaContent = await response.text()
  } else {
    schemaContent = JSON.stringify({ schema: JSON.stringify(fallbackSchema) })
  }

  return {
    ...data,
    digestSRI: generateDigestSRI(schemaContent),
  }
}

/**
 * Generates a SRI digest string for the given content using the specified algorithm.
 * @param content - The content to hash.
 * @param algorithm - The hash algorithm to use (default: sha256).
 * @returns The SRI digest string.
 */
export function generateDigestSRI(content: string, algorithm: string = 'sha256'): string {
  const hash = createHash(algorithm)
    .update(JSON.stringify(JSON.parse(content)), 'utf8')
    .digest('base64')
  return `${algorithm}-${hash}`
}

/**
 * Converts an image URL to a Base64-encoded data URI string.
 *
 * @param url - The image URL to convert.
 * @returns A Base64 data URI string, or a fallback placeholder if the image cannot be fetched or is invalid.
 */
export async function urlToBase64(url?: string): Promise<string> {
  if (!url) {
    console.warn('No URL provided for image conversion.')
    return FALLBACK_BASE64
  }

  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' })

    const contentType = response.headers['content-type']
    if (!contentType || !contentType.startsWith('image/')) {
      console.warn(`The fetched resource is not an image. Content-Type: ${contentType}`)
      return FALLBACK_BASE64
    }

    const base64 = Buffer.from(response.data).toString('base64')
    return `data:${contentType};base64,${base64}`
  } catch (error) {
    if (isAxiosError(error)) {
      console.error(
        `Failed to convert URL to Base64. URL: ${url}. ` +
          `Status: ${error.response?.status ?? 'N/A'}. ` +
          `Message: ${error.message}`,
      )
    } else {
      console.error(`Unexpected error converting URL to Base64: ${error}`)
    }
    return FALLBACK_BASE64
  }
}

export function getVerificationMethodId(didRecord: DidRecord): string {
  try {
    const verificationMethod = didRecord.didDocument?.verificationMethod?.find(
      method =>
        method.type === 'Ed25519VerificationKey2020' &&
        method.id === didRecord.didDocument?.assertionMethod?.[0],
    )
    if (!verificationMethod) {
      throw new Error('Cannot find a suitable Ed25519Signature2020 verification method in DID Document')
    }
    return verificationMethod.id
  } catch (error) {
    console.error(`Failed to get verification method ID.`, error)
    throw error
  }
}
