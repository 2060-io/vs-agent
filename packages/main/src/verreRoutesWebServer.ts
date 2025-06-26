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
import { createHash } from 'crypto'
import express from 'express'
import path from 'path'

import { VsAgent } from './utils/VsAgent'

export const addVerreWebRoutes = async (app: express.Express, agent: VsAgent, veranaBaseUrl: string = 'http://localhost:3001') => {
  // Create a Verifiable Presentation for ECS Service
  // TODO: It's only for testing purposes, remove it later
  // Verifiable JsonSchemaCredential
  registerVerifiablePresentationEndpoint(
    '/ecs-service-c-vp.json',
    'ECS Service C',
    ['VerifiableCredential', 'VerifiableTrustCredential'],
    {
      id: 'did:example:subject123',
      claims: {
        name: 'Student Health Portal',
        type: 'WEB_PORTAL',
        description: 'Portal to access physical and mental health services for students.',
        logo: 'iVBORw0KGgoAAAANSUhEUgAAAAUA...',
        minimumAgeRequired: 18,
        termsAndConditions: 'https://university.edu.co/Health-portal/terms',
        termsAndConditionsHash: 'sha256-YWJjZGVmMTIzNDU2Nzg5MA==',
        privacyPolicy: 'https://university.edu.co/Health-portal/privacity',
        privacyPolicyHash: 'sha256-ZXl6amdoa2xtbnByc3R1dnd4eXo=',
      },
    },
    app,
    agent,
    {
      id: `${veranaBaseUrl}/schemas-example-service.json`,
      type: 'JsonSchemaCredential',
    },
  )

  // Verifiable JsonSchemaCredential
  registerVerifiablePresentationEndpoint(
    '/ecs-org-c-vp.json',
    'ECS ORG C',
    ['VerifiableCredential', 'VerifiableTrustCredential'],
    {
      id: 'did:example:university123',
      claims: {
        name: 'National University of Technology',
        logo: 'iVBORw0KGgoAAAANSUhEUgAAAAUA...',
        registryId: 'UNI-NT-2025',
        registryUrl: 'https://registry.education.ma.us/massachusetts-institute-of-technology',
        address: '77 Massachusetts Ave, Cambridge, MA 02139, United States',
        type: 'PUBLIC',
        countryCode: 'CO',
      },
    },
    app,
    agent,
    {
      id: `${veranaBaseUrl}/schemas-example-org.json`,
      type: 'JsonSchemaCredential',
    },
  )

  // Verifiable JsonSchema
  registerVerifiableCredentialEndpoint(
    '/schemas-example-service.json',
    'ECS SERVICE',
    ['VerifiableCredential', 'JsonSchemaCredential'],
    {
      id: `${veranaBaseUrl}/mainnet/cs/v1/js/12345671`,
      claims: {
        type: 'JsonSchema',
        jsonSchema: {
          $ref: `${veranaBaseUrl}/mainnet/cs/v1/js/12345671`,
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
  registerVerifiableCredentialEndpoint(
    '/schemas-example-org.json',
    'ECS ORG C',
    ['VerifiableCredential', 'JsonSchemaCredential'],
    {
      id: `${veranaBaseUrl}/mainnet/cs/v1/js/12345672`,
      claims: {
        type: 'JsonSchema',
        jsonSchema: {
          $ref: `${veranaBaseUrl}/mainnet/cs/v1/js/12345672`,
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

  // Function to Create a Presentation
  // this function call credential endpoint
  function registerVerifiablePresentationEndpoint(
    path: string,
    logTag: string,
    type: string[],
    subject: W3cCredentialSubject,
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
      subject,
      app,
      agent,
      credentialSchema,
      presentation,
    )
  }

  // GET Function to Retrieve JSON Schemas
  app.get('/mainnet/cs/v1/js/:schemaId', async (req, res) => {
    const schemaMap: Record<string, string> = {
      '12345671': 'ecs-service',
      '12345672': 'ecs-org',
    }
    try {
      const schemaKey = schemaMap[req.params.schemaId]

      if (!schemaKey) {
        return res.status(404).json({ error: 'Schema not found' })
      }

      const filePath = path.join(__dirname, '../../../../', 'public', 'data.json')
      const module = await import(filePath)
      const ecsSchema = module[schemaKey]

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
