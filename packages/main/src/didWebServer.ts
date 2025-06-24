import 'reflect-metadata'

import type { DidWebServerConfig } from './utils/ServerConfig'

import {
  AnonCredsCredentialDefinitionRepository,
  AnonCredsRevocationRegistryDefinitionRepository,
  AnonCredsSchemaRepository,
} from '@credo-ts/anoncreds'
import {
  ClaimFormat,
  DidRepository,
  JsonTransformer,
  VerificationMethod,
  W3cCredential,
  W3cCredentialSchema,
  W3cCredentialSubject,
  W3cJsonLdSignCredentialOptions,
} from '@credo-ts/core'
import cors from 'cors'
import { createHash } from 'crypto'
import express from 'express'
import fs from 'fs'
import multer, { diskStorage } from 'multer'

import { VsAgent } from './utils/VsAgent'

export const startDidWebServer = async (agent: VsAgent, config: DidWebServerConfig) => {
  const app = config.app ?? express()

  if (config.cors) {
    app.use(cors())
  }

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.set('json spaces', 2)

  addDidWebRoutes(app, agent, config.baseUrl)

  const server = app.listen(config.port)

  return server
}

const baseFilePath = './tails'
const indexFilePath = `./${baseFilePath}/index.json`

if (!fs.existsSync(baseFilePath)) {
  fs.mkdirSync(baseFilePath, { recursive: true })
}
const tailsIndex = (
  fs.existsSync(indexFilePath) ? JSON.parse(fs.readFileSync(indexFilePath, { encoding: 'utf-8' })) : {}
) as Record<string, string>

function fileHash(filePath: string, algorithm = 'sha256') {
  return new Promise<string>((resolve, reject) => {
    const shasum = createHash(algorithm)
    try {
      const s = fs.createReadStream(filePath)
      s.on('data', function (data) {
        shasum.update(data)
      })
      // making digest
      s.on('end', function () {
        const hash = shasum.digest('hex')
        return resolve(hash)
      })
    } catch (error) {
      return reject('error in calculation')
    }
  })
}

const fileStorage = diskStorage({
  filename: (req: any, file: { originalname: string }, cb: (arg0: null, arg1: string) => void) => {
    cb(null, file.originalname + '-' + new Date().toISOString())
  },
})

export const addDidWebRoutes = async (app: express.Express, agent: VsAgent, anoncredsBaseUrl?: string) => {
  // DidDocument
  app.get('/.well-known/did.json', async (req, res) => {
    agent.config.logger.info(`Public DidDocument requested`)
    if (agent.did) {
      const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })
      const didDocument = didRecord.didDocument
      if (didDocument) {
        res.send(didDocument.toJSON())
      } else {
        res.status(500).end()
      }
    } else {
      res.status(404).end()
    }
  })

  if (anoncredsBaseUrl) {
    // Schemas
    app.get('/anoncreds/v1/schema/:schemaId', async (req, res) => {
      const schemaId = req.params.schemaId
      agent.config.logger.debug(`schema requested: ${schemaId}`)
      const schemaRepository = agent.dependencyManager.resolve(AnonCredsSchemaRepository)
      const schemaRecord = await schemaRepository.findBySchemaId(
        agent.context,
        `${agent.did}?service=anoncreds&relativeRef=/schema/${schemaId}`,
      )

      if (schemaRecord) {
        agent.config.logger.debug(`schema found: ${schemaId}`)
        res.send({ resource: schemaRecord.schema, resourceMetadata: {} })
        return
      }
      agent.config.logger.debug(`schema not found: ${schemaId}`)
      res.send(404)
    })

    // Credential Definitions
    app.get('/anoncreds/v1/credDef/:credentialDefinitionId', async (req, res) => {
      const credentialDefinitionId = req.params.credentialDefinitionId

      agent.config.logger.debug(`credential definition requested: ${credentialDefinitionId}`)
      const credentialDefinitionRepository = agent.dependencyManager.resolve(
        AnonCredsCredentialDefinitionRepository,
      )

      const credentialDefinitionRecord = await credentialDefinitionRepository.findByCredentialDefinitionId(
        agent.context,
        `${agent.did}?service=anoncreds&relativeRef=/credDef/${credentialDefinitionId}`,
      )

      if (credentialDefinitionRecord) {
        res.send({ resource: credentialDefinitionRecord.credentialDefinition, resourceMetadata: {} })
        return
      }

      res.send(404)
    })

    // Endpoint to retrieve a revocation registry definition by its ID
    app.get('/anoncreds/v1/revRegDef/:revocationDefinitionId', async (req, res) => {
      const revocationDefinitionId = req.params.revocationDefinitionId

      agent.config.logger.debug(`revocate definition requested: ${revocationDefinitionId}`)
      const revocationDefinitionRepository = agent.dependencyManager.resolve(
        AnonCredsRevocationRegistryDefinitionRepository,
      )

      const revocationDefinitionRecord =
        await revocationDefinitionRepository.findByRevocationRegistryDefinitionId(
          agent.context,
          `${agent.did}?service=anoncreds&relativeRef=/revRegDef/${revocationDefinitionId}`,
        )

      if (revocationDefinitionRecord) {
        res.send({
          resource: revocationDefinitionRecord.revocationRegistryDefinition,
          resourceMetadata: {
            statusListEndpoint: `${anoncredsBaseUrl}/anoncreds/v1/revStatus/${revocationDefinitionId}`,
          },
        })
        return
      }

      res.send(404)
    })

    // Endpoint to retrieve the revocation status list for a specific revocation definition ID
    // Optional: Accepts a timestamp parameter (not currently used in the logic)
    app.get('/anoncreds/v1/revStatus/:revocationDefinitionId/:timestamp?', async (req, res) => {
      const revocationDefinitionId = req.params.revocationDefinitionId

      agent.config.logger.debug(`revocate definition requested: ${revocationDefinitionId}`)
      const revocationDefinitionRepository = agent.dependencyManager.resolve(
        AnonCredsRevocationRegistryDefinitionRepository,
      )

      const revocationDefinitionRecord =
        await revocationDefinitionRepository.findByRevocationRegistryDefinitionId(
          agent.context,
          `${agent.did}?service=anoncreds&relativeRef=/revRegDef/${revocationDefinitionId}`,
        )

      if (revocationDefinitionRecord) {
        const revStatusList = revocationDefinitionRecord.metadata.get('revStatusList')
        res.send({
          resource: revStatusList,
          resourceMetadata: {
            previousVersionId: '',
            nextVersionId: '',
          },
        })
        return
      }

      res.send(404)
    })

    app.get('/anoncreds/v1/tails/:tailsFileId', async (req, res) => {
      agent.config.logger.debug(`requested file`)

      const tailsFileId = req.params.tailsFileId
      if (!tailsFileId) {
        res.status(409).end()
        return
      }

      const fileName = tailsIndex[tailsFileId]

      if (!fileName) {
        agent.config.logger.debug(`no entry found for tailsFileId: ${tailsFileId}`)
        res.status(404).end()
        return
      }

      const path = `${baseFilePath}/${fileName}`
      try {
        agent.config.logger.debug(`reading file: ${path}`)

        if (!fs.existsSync(path)) {
          agent.config.logger.debug(`file not found: ${path}`)
          res.status(404).end()
          return
        }

        const file = fs.createReadStream(path)
        res.setHeader('Content-Disposition', `attachment: filename="${fileName}"`)
        file.pipe(res)
      } catch (error) {
        agent.config.logger.debug(`error reading file: ${path}`)
        res.status(500).end()
      }
    })

    // Endpoint to upload a tails file for a specific tailsFileId
    app.put(
      '/anoncreds/v1/tails/:tailsFileId',
      multer({ storage: fileStorage }).single('file'),
      async (req, res) => {
        agent.config.logger.info(`tails file upload: ${req.params.tailsFileId}`)

        const file = req.file

        if (!file) {
          agent.config.logger.info(`No file found: ${JSON.stringify(req.headers)}`)
          return res.status(400).send('No files were uploaded.')
        }

        const tailsFileId = req.params.tailsFileId
        if (!tailsFileId) {
          // Clean up temporary file
          fs.rmSync(file.path)
          return res.status(409).send('Missing tailsFileId')
        }

        const item = tailsIndex[tailsFileId]

        if (item) {
          agent.config.logger.debug(`there is already an entry for: ${tailsFileId}`)
          res.status(409).end()
          return
        }

        const hash = await fileHash(file.path)
        const destinationPath = `${baseFilePath}/${hash}`

        if (fs.existsSync(destinationPath)) {
          agent.config.logger.warn('tails file already exists')
        } else {
          fs.copyFileSync(file.path, destinationPath)
          fs.rmSync(file.path)
        }

        // Store filename in index
        tailsIndex[tailsFileId] = hash
        fs.writeFileSync(indexFilePath, JSON.stringify(tailsIndex))

        res.status(200).end()
      },
    )

    // Create a Verifiable Presentation for ECS Service
    // TODO: It's only for testing purposes, remove it later
    registerVerifiableCredentialEndpoint(
      '/ecs-service-c-vp.json',
      'ECS Service C',
      {
        id: 'did:example:subject123',
        claims: {
          name: 'Student Health Portal',
          type: 'WEB_PORTAL',
          description: 'Portal to access physical and mental health services for students.',
          logo: 'iVBORw0KGgoAAAANSUhEUgAAAAUA...',
          minimumAgeRequired: 16,
          termsAndConditions: 'https://university.edu.co/Health-portal/terms',
          termsAndConditionsHash: 'sha256-YWJjZGVmMTIzNDU2Nzg5MA==',
          privacyPolicy: 'https://university.edu.co/Health-portal/privacity',
          privacyPolicyHash: 'sha256-ZXl6amdoa2xtbnByc3R1dnd4eXo=',
        },
      },
      app,
      agent,
      {
        id: 'did:example:subject123',
        type: 'JsonSchema',
      },
    )

    registerVerifiableCredentialEndpoint(
      '/ecs-org-c-vp.json',
      'ECS ORG C',
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
        id: 'did:example:subject123',
        type: 'JsonSchema',
      },
    )

    function generateDigestSRI(content: string, algorithm: string = 'sha256'): string {
      const hash = createHash(algorithm).update(content).digest('base64')
      return `${algorithm}-${hash}`
    }
    function addDigestSRI<T extends object>(data: T): T & { digestSRI: string } {
      return {
        ...data,
        digestSRI: generateDigestSRI(JSON.stringify(data)),
      }
    }
    function registerVerifiableCredentialEndpoint(
      path: string,
      logTag: string,
      credentialSubject: W3cCredentialSubject,
      app: express.Application,
      agent: VsAgent,
      credentialSchema: W3cCredentialSchema,
    ) {
      app.get(path, async (req, res) => {
        agent.config.logger.info(`${logTag} VP requested`)

        const unsignedCredential = new W3cCredential({
          context: [
            'https://www.w3.org/2018/credentials/v1',
            'https://www.w3.org/2018/credentials/examples/v1',
          ],
          id: agent.did,
          type: ['VerifiableCredential', 'JsonSchemaCredential'],
          issuer: 'did:example:issuer456',
          issuanceDate: new Date().toISOString(),
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 año
          credentialSubject,
        })
        unsignedCredential.credentialSubject = addDigestSRI(credentialSubject)
        unsignedCredential.credentialSchema = addDigestSRI(credentialSchema)

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
        res.send(signedCredential)
      })
    }
  }
}
