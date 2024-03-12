import 'reflect-metadata'

import type { DidWebServerConfig } from './utils/ServerConfig'

import { ServiceAgent } from './utils/ServiceAgent'
import express from 'express'
import cors from 'cors'
import { AnonCredsCredentialDefinitionRepository, AnonCredsSchemaRepository } from '@credo-ts/anoncreds'
import path from 'path'
import { DidDocumentService } from '@credo-ts/core'
import QRCode from 'qrcode'
import { createInvitation } from './utils/agent'

export const startDidWebServer = async (agent: ServiceAgent, config: DidWebServerConfig) => {
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

export const addDidWebRoutes = async (app: express.Express, agent: ServiceAgent, anoncredsBaseUrl?: string) => {
    // DidDocument
    app.get('/.well-known/did.json', async (req, res) => {
      agent.config.logger.info(`Public DidDocument requested`)
      if (agent.did) {
        const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })
        const didDocument = didRecord.didDocument
        if (anoncredsBaseUrl) {
          didDocument?.service?.push(new DidDocumentService({
            id: `${agent.did}#anoncreds`,
            serviceEndpoint: `${anoncredsBaseUrl}/anoncreds/v1`,
            type: 'AnonCredsRegistry'
          }))
        }
  
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
        const schemaRecord = await schemaRepository.findBySchemaId(agent.context,
          `${agent.did}?service=anoncreds&relativeRef=/schema/${schemaId}`
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
        const credentialDefinitionRepository = agent.dependencyManager.resolve(AnonCredsCredentialDefinitionRepository)
    
        const credentialDefinitionRecord = await credentialDefinitionRepository.findByCredentialDefinitionId(agent.context,
          `${agent.did}?service=anoncreds&relativeRef=/credDef/${credentialDefinitionId}`
        )
    
        if (credentialDefinitionRecord) {
          res.send({ resource: credentialDefinitionRecord.credentialDefinition, resourceMetadata: {} })
          return
        }
    
        res.send(404)
      })
    }
  
    const staticDir = path.join(__dirname, '../public')
    app.use(express.static(staticDir))
  
    // Add invitation endpoint (TODO: remove as it should be part of an external API)
    app.get('/invitation', async (req, res) => {
      const { url: invitationUrl } = await createInvitation(agent)
      res.send(invitationUrl)
    })
  
    app.get('/qr', async (req, res) => {
  
      const { fcolor, bcolor, size, padding, level } = req.query as { fcolor?: string, bcolor?: string, size?: number, padding?: number, level?: string }
  
      const { url: invitationUrl } = await createInvitation(agent)
  
      function isQRCodeErrorCorrectionLevel (input?: string): input is QRCode.QRCodeErrorCorrectionLevel {
        return input ? ['low', 'medium', 'quartile', 'high', 'L', 'M', 'Q', 'H'].includes(input) : false
      }
      const errorCorrectionLevel: QRCode.QRCodeErrorCorrectionLevel = isQRCodeErrorCorrectionLevel(level) ? level : 'L'
  
      try {
        const qr = await QRCode.toBuffer(invitationUrl,
        {
          color: {
            dark: fcolor ? `#${fcolor}` : undefined,
            light: bcolor ? `#${bcolor}` : undefined,
          },
          errorCorrectionLevel,
          width: size,
          margin: padding,
        })
        res.header("Content-Type", "image/png; charset=utf-8")
        res.send(qr)
      } catch(error) {
        res.status(500)      
        res.json({ error: error.message }).end()
      }
    })
}