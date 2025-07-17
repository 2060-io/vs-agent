/**
 * @file selfVtrRoutes.ts
 * This file is for testing only.
 * All endpoints and logic here are temporary.
 *
 * @description
 * This module defines HTTP endpoints for testing and development purposes
 * related to Verifiable Credentials and Presentations (W3C VC/VP) using JSON Schema.
 *
 * The routes include:
 * - Endpoints to issue example credentials and presentations.
 * - Endpoints to retrieve and validate JSON Schemas.
 * - Endpoints to upload and validate credential data.
 * - Utilities for SRI (Subresource Integrity) calculation.
 *
 * @todo Once the TSR has been implemented, remove this self-validation.
 */

import 'reflect-metadata'

import {
  ClaimFormat,
  DidRepository,
  JsonTransformer,
  VerificationMethod,
  W3cCredential,
  W3cCredentialSchema,
  W3cCredentialSubject,
  W3cJsonLdSignCredentialOptions,
  W3cJsonLdSignPresentationOptions,
  W3cPresentation,
} from '@credo-ts/core'
import Ajv from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import axios from 'axios'
import { createHash } from 'crypto'
import express from 'express'
import * as fs from 'fs'
import * as path from 'path'

import {
  AGENT_INVITATION_IMAGE_URL,
  AGENT_LABEL,
  TESTVTR_ORG_ADDRESS,
  TESTVTR_ORG_COUNTRYCODE,
  TESTVTR_ORG_REGISTRYID,
  TESTVTR_ORG_REGISTRYURL,
  TESTVTR_ORG_TYPE,
  TESTVTR_SERVICE_DESCRIPTION,
  TESTVTR_SERVICE_MINIMUMAGEREQUIRED,
  TESTVTR_SERVICE_PRIVACYPOLICY,
  TESTVTR_SERVICE_TERMSANDCONDITIONS,
  TESTVTR_SERVICE_TYPE,
} from './config'
import { VsAgent } from './utils/VsAgent'

// Load schemas from data.json at startup (used for schema validation and mock responses)
const ecsSchemas = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'data.json'), 'utf-8'))
const ajv = new Ajv({ strict: false })
addFormats(ajv)

// Main function to add all test routes to the Express app
export const addSelfVtrRoutes = async (app: express.Express, agent: VsAgent, publicApiBaseUrl: string) => {
  // Create a Verifiable Presentation for ECS Service
  // Verifiable JsonSchemaCredential
  // Register endpoints for example Verifiable Presentations
  await registerVerifiablePresentationEndpoint(
    '/self-vtr/ecs-service-c-vp.json',
    'ecs-service',
    ['VerifiableCredential', 'VerifiableTrustCredential'],
    app,
    agent,
    {
      id: `${publicApiBaseUrl}/self-vtr/schemas-example-service.json`,
      type: 'JsonSchemaCredential',
    },
  )

  // Verifiable JsonSchemaCredential
  // Register endpoints for example Verifiable Presentations
  await registerVerifiablePresentationEndpoint(
    '/self-vtr/ecs-org-c-vp.json',
    'ecs-org',
    ['VerifiableCredential', 'VerifiableTrustCredential'],
    app,
    agent,
    {
      id: `${publicApiBaseUrl}/self-vtr/schemas-example-org.json`,
      type: 'JsonSchemaCredential',
    },
  )

  // Verifiable JsonSchema
  // Register endpoints for example Verifiable Credential
  registerVerifiableCredentialEndpoint(
    '/self-vtr/schemas-example-service.json',
    'ECS SERVICE',
    ['VerifiableCredential', 'JsonSchemaCredential'],
    {
      id: `${publicApiBaseUrl}/self-vtr/cs/v1/js/ecs-service`,
      claims: {
        type: 'JsonSchema',
        jsonSchema: {
          $ref: `${publicApiBaseUrl}/self-vtr/cs/v1/js/ecs-service`,
        },
      },
    },
    app,
    agent,
    {
      id: 'https://www.w3.org/ns/credentials/json-schema/v2.json',
      type: 'JsonSchema',
    },
  )

  // Verifiable JsonSchema
  // Register endpoints for example Verifiable Credential
  registerVerifiableCredentialEndpoint(
    '/self-vtr/schemas-example-org.json',
    'ECS ORG C',
    ['VerifiableCredential', 'JsonSchemaCredential'],
    {
      id: `${publicApiBaseUrl}/self-vtr/cs/v1/js/ecs-org`,
      claims: {
        type: 'JsonSchema',
        jsonSchema: {
          $ref: `${publicApiBaseUrl}/self-vtr/cs/v1/js/ecs-org`,
        },
      },
    },
    app,
    agent,
    {
      id: 'https://www.w3.org/ns/credentials/json-schema/v2.json',
      type: 'JsonSchema',
    },
  )

  function generateDigestSRI(content: string, algorithm: string = 'sha256'): string {
    const hash = createHash(algorithm)
      .update(JSON.stringify(JSON.parse(content)), 'utf8')
      .digest('base64')
    return `${algorithm}-${hash}`
  }

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

  // Function to Create a Credential Endpoint
  function registerVerifiableCredentialEndpoint(
    path: string,
    logTag: string,
    type: string[],
    { id: subjectId, claims }: W3cCredentialSubject,
    app: express.Application,
    agent: VsAgent,
    credentialSchema: W3cCredentialSchema,
    presentation?: W3cPresentation,
  ) {
    app.get(path, async (req, res) => {
      agent.config.logger.info(`${logTag} VP requested`)

      if (!claims) claims = await getClaims(agent, { id: subjectId }, logTag)
      const unsignedCredential = new W3cCredential({
        context: [
          'https://www.w3.org/2018/credentials/v1',
          'https://www.w3.org/2018/credentials/examples/v1',
        ],
        id: agent.did,
        type,
        issuer: agent.did!,
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
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

      res.setHeader('Content-Type', 'application/json')
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
        res.send(signedPresentation)
      } else res.send(signedCredential.jsonCredential)
    })
  }

  /**
   * Retrieves claims (attributes) for a verifiable credential based on a `subjectId` and a `logTag`.
   *
   * - If a corresponding generic record exists, its content is returned.
   * - If not, default claims are constructed and validated against the schema.
   *
   * @param agent - An instance of `VsAgent` used to query generic records.
   * @param subject - A `W3cCredentialSubject` object containing the subject `id`.
   * @param logTag - A string tag used to identify the type of credential (e.g., 'ecs-service').
   *
   * @returns The validated credential subject to be used in a verifiable credential.
   * @throws Error if schema is not found or claims are invalid.
   */
  async function getClaims(
    agent: VsAgent,
    { id: subjectId }: W3cCredentialSubject,
    logTag: string
  ): Promise<Record<string, unknown>> {
    const record = await agent.genericRecords.findById(`${subjectId}-${logTag}`)
    if (record?.content) return record.content

    // Default claims fallback
    const claims =
      logTag === 'ecs-service'
        ? {
            name: AGENT_LABEL,
            type: TESTVTR_SERVICE_TYPE,
            description: TESTVTR_SERVICE_DESCRIPTION,
            logo: await urlToBase64(AGENT_INVITATION_IMAGE_URL),
            minimumAgeRequired: TESTVTR_SERVICE_MINIMUMAGEREQUIRED,
            termsAndConditions: TESTVTR_SERVICE_TERMSANDCONDITIONS,
            privacyPolicy: TESTVTR_SERVICE_PRIVACYPOLICY,
          }
        : {
            name: AGENT_LABEL,
            logo: await urlToBase64(AGENT_INVITATION_IMAGE_URL),
            registryId: TESTVTR_ORG_REGISTRYID,
            registryUrl: TESTVTR_ORG_REGISTRYURL,
            address: TESTVTR_ORG_ADDRESS,
            type: TESTVTR_ORG_TYPE,
            countryCode: TESTVTR_ORG_COUNTRYCODE,
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

  // Function to Create a Presentation
  // this function call credential endpoint
  async function registerVerifiablePresentationEndpoint(
    path: string,
    logTag: string,
    type: string[],
    app: express.Application,
    agent: VsAgent,
    credentialSchema: W3cCredentialSchema,
  ) {
    const presentation = new W3cPresentation({
      context: ['https://www.w3.org/2018/credentials/v1'],
      id: agent.did,
      type: ['VerifiablePresentation'],
      holder: agent.did,
      verifiableCredential: [],
    })
    registerVerifiableCredentialEndpoint(
      path,
      logTag,
      type,
      { id: agent.did },
      app,
      agent,
      credentialSchema,
      presentation,
    )
  }

  // GET Function to Retrieve JSON Schemas
  app.get('/self-vtr/cs/v1/js/:schemaId', async (req, res) => {
    try {
      const { schemaId } = req.params
      if (!schemaId) {
        return res.status(404).json({ error: 'Schema not found' })
      }
      const ecsSchema = ecsSchemas[schemaId]

      res.json({
        id: 101,
        tr_id: 1002,
        created: '2024-03-12T12:00:00Z',
        modified: '2024-03-12T12:30:00Z',
        archived: '',
        deposit: 5000,
        json_schema: JSON.stringify(ecsSchema),
        issuer_grantor_validation_validity_period: 365,
        verifier_grantor_validation_validity_period: 180,
        issuer_validation_validity_period: 730,
        verifier_validation_validity_period: 90,
        holder_validation_validity_period: 60,
        issuer_perm_management_mode: 'STRICT',
        verifier_perm_management_mode: 'FLEXIBLE',
      })
    } catch (error) {
      agent.config.logger.error(`Error loading schema file: ${error.message}`)
      res.status(500).json({ error: 'Failed to load schema' })
    }
  })


  // This function retrieve issuer permission for testing
  app.get('/self-vtr/perm/v1/find_with_did', (req, res) => {
    const did = req.query.did as string
    if (!did) {
      return res.status(400).json({ error: 'Missing required "did" query parameter.' })
    }

    try {
      res.json({ type: 'ISSUER' })
    } catch (err) {
      console.error('Error in findWithDid:', err)
      res.status(500).json({ error: 'Internal server error.' })
    }
  })
}

/**
 * Converts an image URL to a Base64-encoded data URI string.
 *
 * @param url - The image URL to convert.
 * @returns A Base64 data URI string, or a fallback placeholder if the image cannot be fetched or is invalid.
 */
export async function urlToBase64(url?: string): Promise<string> {
  const FALLBACK_BASE64 = 'base64string'

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
    console.error(`Failed to convert URL to Base64. URL: ${url}`, error)
    return FALLBACK_BASE64
  }
}
