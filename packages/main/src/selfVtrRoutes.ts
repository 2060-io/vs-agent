/**
 * @file verreRoutesWebServer.ts
 * This file is for development/testing only. Do not use in production.
 * All endpoints and logic here are temporary and should be removed before release.
 *
 * @description
 * This module defines temporary HTTP endpoints for testing and development purposes
 * related to Verifiable Credentials and Presentations (W3C VC/VP) using JSON Schema.
 *
 * The routes include:
 * - Endpoints to issue example credentials and presentations.
 * - Endpoints to retrieve and validate JSON Schemas.
 * - Endpoints to upload and validate credential data.
 * - Utilities for SRI (Subresource Integrity) calculation.
 *
 * ⚠️ WARNING: This file is for development/testing only and should be removed before deploying to production.
 *
 * @todo Remove this file and its functions before production.
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
import { createHash } from 'crypto'
import express from 'express'
import * as fs from 'fs'
import * as path from 'path'

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
    '/ecs-service-c-vp.json',
    'ecs-service',
    ['VerifiableCredential', 'VerifiableTrustCredential'],
    app,
    agent,
    {
      id: `${publicApiBaseUrl}/schemas-example-service.json`,
      type: 'JsonSchemaCredential',
    },
  )

  // Verifiable JsonSchemaCredential
  // Register endpoints for example Verifiable Presentations
  await registerVerifiablePresentationEndpoint(
    '/ecs-org-c-vp.json',
    'ecs-org',
    ['VerifiableCredential', 'VerifiableTrustCredential'],
    app,
    agent,
    {
      id: `${publicApiBaseUrl}/schemas-example-org.json`,
      type: 'JsonSchemaCredential',
    },
  )

  // Verifiable JsonSchema
  // Register endpoints for example Verifiable Credential
  registerVerifiableCredentialEndpoint(
    '/schemas-example-service.json',
    'ECS SERVICE',
    ['VerifiableCredential', 'JsonSchemaCredential'],
    {
      id: `${publicApiBaseUrl}/mainnet/cs/v1/js/ecs-service`,
      claims: {
        type: 'JsonSchema',
        jsonSchema: {
          $ref: `${publicApiBaseUrl}/mainnet/cs/v1/js/ecs-service`,
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
    '/schemas-example-org.json',
    'ECS ORG C',
    ['VerifiableCredential', 'JsonSchemaCredential'],
    {
      id: `${publicApiBaseUrl}/mainnet/cs/v1/js/ecs-org`,
      claims: {
        type: 'JsonSchema',
        jsonSchema: {
          $ref: `${publicApiBaseUrl}/mainnet/cs/v1/js/ecs-org`,
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

  // TODO: remove testing functions
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
        issuer: 'did:example:issuer456',
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
        challenge: 'challenge-' + Date.now(),
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
          challenge: 'challenge-' + Date.now(),
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
   * - If not, default claims are returned depending on the value of `logTag`.
   *
   * @param agent - An instance of `VsAgent` used to query generic records.
   * @param subject - A `W3cCredentialSubject` object containing the subject `id`.
   * @param logTag - A string tag used to identify the type of credential (e.g., 'ecs-service').
   *
   * @returns An object containing the credential claims, to be used as the `credentialSubject` in a verifiable credential.
   */
  async function getClaims(agent: VsAgent, { id: subjectId }: W3cCredentialSubject, logTag: string) {
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
  app.get('/mainnet/cs/v1/js/:schemaId', async (req, res) => {
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

  /**
   * POST /upload/:schemaId
   *
   * Upload and validate credential data against the JSON schema defined in data.json.
   *
   * Usage:
   *   - :schemaId must be either "ecs-service" or "ecs-org" (as defined in data.json).
   *   - The request body should be a JSON object matching the schema at data.json > [schemaId] > properties > credentialSubject.
   *   - The "id" field is automatically set to the agent's DID.
   *
   * Example using curl:
   *
   *   curl -X POST http://localhost:3001/upload/ecs-service \
   *     -H "Content-Type: application/json" \
   *     -d '{
   *       "name": "Health Portal",
   *       "type": "WEB_PORTAL",
   *       "description": "Some description",
   *       "logo": "base64string",
   *       "minimumAgeRequired": 18,
   *       "termsAndConditions": "https://example.com/terms",
   *       "termsAndConditionsHash": "hash",
   *       "privacyPolicy": "https://example.com/privacy",
   *       "privacyPolicyHash": "hash"
   *     }'
   *
   * Responses:
   *   - 200 OK: Data is valid and accepted.
   *   - 400 Bad Request: Data is invalid according to the schema.
   *   - 404 Not Found: schemaId does not exist in data.json.
   *   - 500 Internal Server Error: Unexpected error.
   */
  app.post('/upload/:schemaId', async (req, res) => {
    const ecsSchema = ecsSchemas[req.params.schemaId]
    try {
      if (!ecsSchema) {
        return res.status(404).json({ error: 'Schema not defined in data.json' })
      }

      const validate = ajv.compile(ecsSchema.properties.credentialSubject)
      const isValid = validate({ ...req.body, id: agent.did })
      if (!isValid) {
        return res.status(400).json({
          error: 'Invalid data',
          details: validate.errors?.map(e => ({
            message: e.message,
            path: e.instancePath,
            keyword: e.keyword,
            params: e.params,
          })),
        })
      }

      const recordId = `${agent.did}-${req.params.schemaId}`
      try {
        const existing = await agent.genericRecords.findById(recordId)
        if (existing) {
          await agent.genericRecords.delete(existing)
        }
      } catch (err) {}

      await agent.genericRecords.save({
        id: recordId,
        content: req.body,
      })
      return res.status(200).json({ message: 'Data is valid and accepted' })
    } catch (error) {
      console.error(`Error validating data: ${error.message}`)
      return res.status(500).json({ error: 'Internal Server Error' })
    }
  })

  // This function retrieve issuer permission for testing
  app.get('/perm/v1/find_with_did', (req, res) => {
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
