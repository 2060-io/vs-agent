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
  LogLevel,
} from '@credo-ts/core'
import Ajv, { AnySchemaObject } from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import axios from 'axios'
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
} from '../config'

import { VsAgent } from './VsAgent'
import { getEcsSchemas } from './data'
import { TsLogger } from './logger'

const ajv = new Ajv({ strict: false })
addFormats(ajv)

export const setupSelfTr = async ({
  agent,
  publicApiBaseUrl,
}: {
  agent: VsAgent
  publicApiBaseUrl: string
}) => {
  const logger = new TsLogger(LogLevel.info, 'SetlTr')
  const ecsSchemas = getEcsSchemas(publicApiBaseUrl)

  const presentations = [
    {
      name: 'ecs-service',
      schemaUrl: `${publicApiBaseUrl}/self-tr/schemas-example-service.json`,
    },
    {
      name: 'ecs-org',
      schemaUrl: `${publicApiBaseUrl}/self-tr/schemas-example-org.json`,
    },
  ]

  const credentials = [
    {
      name: 'example-service',
      id: `${publicApiBaseUrl}/self-tr/cs/v1/js/ecs-service`,
    },
    {
      name: 'example-org',
      id: `${publicApiBaseUrl}/self-tr/cs/v1/js/ecs-org`,
    },
  ]

  for (const { name, schemaUrl } of presentations) {
    await generateVerifiablePresentation(
      agent,
      logger,
      ecsSchemas,
      name,
      ['VerifiableCredential', 'VerifiableTrustCredential'],
      {
        id: schemaUrl,
        type: 'JsonSchemaCredential',
      },
    )
  }

  for (const { name, id } of credentials) {
    await generateVerifiableCredential(
      agent,
      logger,
      ecsSchemas,
      name,
      ['VerifiableCredential', 'JsonSchemaCredential'],
      {
        id,
        claims: {
          type: 'JsonSchema',
          jsonSchema: {
            $ref: id,
          },
        },
      },
      {
        id: 'https://www.w3.org/ns/credentials/json-schema/v2.json',
        type: 'JsonSchema',
      },
    )
  }
}

/**
 * Generates a verifiable credential or presentation, signing it with the agent's DID.
 * @param logTag - Identifier for the credential type.
 * @param type - Array of credential types.
 * @param subject - Subject information and claims.
 * @param credentialSchema - Schema for the credential.
 * @param presentation - Optional presentation to include the credential.
 * @returns The signed verifiable credential or presentation.
 */
async function generateVerifiableCredential(
  agent: VsAgent,
  logger: TsLogger,
  ecsSchemas: Record<string, AnySchemaObject>,
  logTag: string,
  type: string[],
  subject: { id: string; claims?: any },
  credentialSchema: W3cCredentialSchema,
  presentation?: W3cPresentation,
): Promise<any> {
  const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })

  const { id: subjectId } = subject
  let claims = subject.claims

  if (!claims) {
    claims = await getClaims(agent, ecsSchemas, { id: subjectId }, logTag)
  }

  const unsignedCredential = new W3cCredential({
    context: ['https://www.w3.org/2018/credentials/v1', 'https://www.w3.org/2018/credentials/examples/v1'],
    id: agent.did,
    type,
    issuer: agent.did!,
    issuanceDate: new Date().toISOString(),
    expirationDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    credentialSubject: {
      id: subjectId,
      claims: presentation ? claims : await addDigestSRI(subjectId, claims),
    },
  })

  unsignedCredential.credentialSchema = presentation
    ? credentialSchema
    : await addDigestSRI(credentialSchema.id, credentialSchema)

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
    didRecord.metadata.set(logTag, signedCredential.jsonCredential)
    await agent.context.dependencyManager.resolve(DidRepository).update(agent.context, didRecord)
    return signedCredential.jsonCredential
  }
}

/**
 * Generates a verifiable presentation containing a verifiable credential.
 * @param logTag - Identifier for the credential type.
 * @param type - Array of credential types.
 * @param credentialSchema - Schema for the credential.
 * @returns The signed verifiable presentation.
 */
async function generateVerifiablePresentation(
  agent: VsAgent,
  logger: TsLogger,
  ecsSchemas: Record<string, AnySchemaObject>,
  logTag: string,
  type: string[],
  credentialSchema: W3cCredentialSchema,
) {
  if (!agent.did) throw Error('The DID must be set up')
  const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })

  const presentation = new W3cPresentation({
    context: ['https://www.w3.org/2018/credentials/v1'],
    id: agent.did,
    type: ['VerifiablePresentation'],
    holder: agent.did,
    verifiableCredential: [],
  })
  const result = await generateVerifiableCredential(
    agent,
    logger,
    ecsSchemas,
    logTag,
    type,
    { id: agent.did },
    credentialSchema,
    presentation,
  )
  didRecord.metadata.set(logTag, result)
  await agent.context.dependencyManager.resolve(DidRepository).update(agent.context, didRecord)
  return result
}

/**
 * Retrieves claims for a subject from storage or builds default claims if not found.
 * Validates claims against the schema for the given logTag.
 * @param agent - The VsAgent instance.
 * @param subject - Credential subject.
 * @param logTag - Identifier for the credential type.
 * @returns The claims object.
 */
async function getClaims(
  agent: VsAgent,
  ecsSchemas: Record<string, AnySchemaObject>,
  { id: subjectId }: W3cCredentialSubject,
  logTag: string,
) {
  const record = await agent.genericRecords.findById(`${subjectId}-${logTag}`)
  if (record?.content) return record.content

  // Default claims fallback
  const claims =
    logTag === 'ecs-service'
      ? {
          name: AGENT_LABEL,
          type: SELF_ISSUED_VTC_SERVICE_TYPE,
          description: SELF_ISSUED_VTC_SERVICE_DESCRIPTION,
          logo: await urlToBase64(AGENT_INVITATION_IMAGE_URL),
          minimumAgeRequired: SELF_ISSUED_VTC_SERVICE_MINIMUMAGEREQUIRED,
          termsAndConditions: SELF_ISSUED_VTC_SERVICE_TERMSANDCONDITIONS,
          privacyPolicy: SELF_ISSUED_VTC_SERVICE_PRIVACYPOLICY,
        }
      : {
          name: AGENT_LABEL,
          logo: await urlToBase64(AGENT_INVITATION_IMAGE_URL),
          registryId: SELF_ISSUED_VTC_ORG_REGISTRYID,
          registryUrl: SELF_ISSUED_VTC_ORG_REGISTRYURL,
          address: SELF_ISSUED_VTC_ORG_ADDRESS,
          type: SELF_ISSUED_VTC_ORG_TYPE,
          countryCode: SELF_ISSUED_VTC_ORG_COUNTRYCODE,
        }

  const ecsSchema = ecsSchemas[logTag]
  if (!ecsSchema) {
    throw new Error(`Schema not defined in data.json for logTag: ${logTag}`)
  }

  const validate = ajv.compile(ecsSchema.properties?.credentialSubject)
  const credentialSubject = { id: subjectId, ...claims }
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
 * Adds a Subresource Integrity (SRI) digest to the provided data using the content fetched from the given id (URL).
 * @param id - The URL to fetch the schema content from.
 * @param data - The data object to which the digest will be added.
 * @returns The data object with an added digestSRI property.
 */
async function addDigestSRI<T extends object>(id?: string, data?: T): Promise<T & { digestSRI: string }> {
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
    digestSRI: generateDigestSRI(schemaContent),
  }
}

/**
 * Generates a SRI digest string for the given content using the specified algorithm.
 * @param content - The content to hash.
 * @param algorithm - The hash algorithm to use (default: sha256).
 * @returns The SRI digest string.
 */
function generateDigestSRI(content: string, algorithm: string = 'sha256'): string {
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
  const FALLBACK_BASE64 = 'https://hologram.zone/images/ico-hologram.png'

  if (!url) {
    console.warn('No URL provided for image conversion.')
  }

  try {
    const response = await axios.get(url ?? FALLBACK_BASE64, { responseType: 'arraybuffer' })

    const contentType = response.headers['content-type']
    if (!contentType || !contentType.startsWith('image/')) {
      console.warn(`The fetched resource is not an image. Content-Type: ${contentType}`)
      return FALLBACK_BASE64
    }

    const base64 = Buffer.from(response.data).toString('base64')
    return `data:${contentType};base64,${base64}`
  } catch (error) {
    console.error(`Failed to convert URL to Base64. URL: ${url}`, error)
    return FALLBACK_BASE64
  }
}
