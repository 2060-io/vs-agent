import 'reflect-metadata'

import type { DidWebServerConfig } from './utils/ServerConfig'

import {
  AnonCredsCredentialDefinitionRepository,
  AnonCredsRevocationRegistryDefinitionRepository,
  AnonCredsSchemaRepository,
} from '@credo-ts/anoncreds'
import cors from 'cors'
import express from 'express'
import fs from 'fs'

import { baseFilePath, tailsIndex } from './services'
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

export const addDidWebRoutes = async (app: express.Express, agent: VsAgent, anoncredsBaseUrl: string) => {
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

  // AnonCreds routes only make sense if we have a public DID (otherwise, we cannot be issuers)
  if (agent.did) {
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
  }
}
