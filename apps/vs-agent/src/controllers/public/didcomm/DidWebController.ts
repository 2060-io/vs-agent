import {
  AnonCredsCredentialDefinitionRepository,
  AnonCredsRevocationRegistryDefinitionRepository,
  AnonCredsSchemaRepository,
} from '@credo-ts/anoncreds'
import { DidRepository } from '@credo-ts/core'
import { Controller, Get, Param, Res, HttpStatus, HttpException, Inject } from '@nestjs/common'
import { Response } from 'express'
import * as fs from 'fs'

import { baseFilePath, tailsIndex, VsAgentService } from '../../../services'

@Controller()
export class DidWebController {
  constructor(
    private readonly agentService: VsAgentService,
    @Inject('PUBLIC_API_BASE_URL') private readonly publicApiBaseUrl: string,
  ) {}

  @Get('/.well-known/did.json')
  async getDidDocument() {
    const agent = await this.agentService.getAgent()
    agent.config.logger.info(`Public DidDocument requested`)
    if (agent.did) {
      const didRepository = agent.context.dependencyManager.resolve(DidRepository)
      const domain = agent.did.split(':').pop()
      const didRecord = await didRepository.findSingleByQuery(agent.context, { domain })
      const didDocument = didRecord?.didDocument
      if (didDocument) {
        return didDocument
      } else {
        throw new HttpException('DID Document not found', HttpStatus.NOT_FOUND)
      }
    } else {
      throw new HttpException('DID not found', HttpStatus.NOT_FOUND)
    }
  }

  @Get('/.well-known/did.jsonl')
  async getDidDocumentLD(@Res() res: Response) {
    const agent = await this.agentService.getAgent()
    agent.config.logger.info(`Public DidDocument requested`)
    if (agent.did) {
      const [didRecord] = await agent.dids.getCreatedDids({ method: 'webvh' })
      const didDocument = didRecord.didDocument
      if (didDocument) {
        const jsonl = JSON.stringify(didRecord.metadata.get('log'))
        res.setHeader('Content-Type', 'application/jsonl; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache')
        res.send(jsonl)
      } else {
        throw new HttpException('DID Document not found', HttpStatus.NOT_FOUND)
      }
    } else {
      throw new HttpException('DID not found', HttpStatus.NOT_FOUND)
    }
  }

  // AnonCreds routes only make sense if we have a public DID (otherwise, we cannot be issuers)
  // Schemas
  @Get('/anoncreds/v1/schema/:schemaId')
  async getSchema(@Param('schemaId') schemaId: string, @Res() res: Response) {
    const agent = await this.agentService.getAgent()
    if (!agent.did) {
      throw new HttpException('DID not found', HttpStatus.NOT_FOUND)
    }

    agent.config.logger.debug(`Schema requested: ${schemaId}`)
    const schemaRepository = agent.dependencyManager.resolve(AnonCredsSchemaRepository)
    const schemaRecord = await schemaRepository.findBySchemaId(
      agent.context,
      `${agent.did}?service=anoncreds&relativeRef=/schema/${schemaId}`,
    )

    if (schemaRecord) {
      agent.config.logger.debug(`schema found: ${schemaId}`)
      res.send({ resource: schemaRecord.schema, resourceMetadata: {} })
    }

    agent.config.logger.debug(`schema not found: ${schemaId}`)
    throw new HttpException('', HttpStatus.NOT_FOUND)
  }

  // Credential Definitions
  @Get('/anoncreds/v1/credDef/:credentialDefinitionId')
  async getCredDef(@Param('credentialDefinitionId') credentialDefinitionId: string, @Res() res: Response) {
    const agent = await this.agentService.getAgent()
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
    }

    throw new HttpException('Credential Definition not found', HttpStatus.NOT_FOUND)
  }

  // Endpoint to retrieve a revocation registry definition by its ID
  @Get('/anoncreds/v1/revRegDef/:revocationDefinitionId')
  async getRevRegDef(@Param('revocationDefinitionId') revocationDefinitionId: string, @Res() res: Response) {
    const agent = await this.agentService.getAgent()

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
          statusListEndpoint: `${this.publicApiBaseUrl}/anoncreds/v1/revStatus/${revocationDefinitionId}`,
        },
      })
    }

    throw new HttpException('Revocation Definition not found', HttpStatus.NOT_FOUND)
  }

  // Endpoint to retrieve the revocation status list for a specific revocation definition ID
  // Optional: Accepts a timestamp parameter (not currently used in the logic)
  @Get('/anoncreds/v1/revStatus/:revocationDefinitionId/:timestamp?')
  async getRevStatus(@Param('revocationDefinitionId') revocationDefinitionId: string, @Res() res: Response) {
    const agent = await this.agentService.getAgent()

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
    }

    throw new HttpException('Revocation Status not found', HttpStatus.NOT_FOUND)
  }

  @Get('/anoncreds/v1/tails/:tailsFileId')
  async getTailsFile(@Param('tailsFileId') tailsFileId: string, @Res() res: Response) {
    const agent = await this.agentService.getAgent()
    agent.config.logger.debug(`requested file`)

    if (!tailsFileId) {
      throw new HttpException('tailsFileId not found', HttpStatus.CONFLICT)
    }

    const fileName = tailsIndex[tailsFileId]

    if (!fileName) {
      agent.config.logger.debug(`no entry found for tailsFileId: ${tailsFileId}`)
      throw new HttpException('tailsFileId not found', HttpStatus.NOT_FOUND)
    }

    const path = `${baseFilePath}/${fileName}`
    try {
      agent.config.logger.debug(`reading file: ${path}`)

      if (!fs.existsSync(path)) {
        agent.config.logger.debug(`file not found: ${path}`)
        throw new HttpException('tailsFileId not found', HttpStatus.NOT_FOUND)
      }

      const file = fs.createReadStream(path)
      res.setHeader('Content-Disposition', `attachment: filename="${fileName}"`)
      file.pipe(res)
    } catch (error) {
      agent.config.logger.debug(`error reading file: ${path}`)
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
