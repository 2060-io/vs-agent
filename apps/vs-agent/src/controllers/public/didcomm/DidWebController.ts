import {
  AnonCredsCredentialDefinitionRepository,
  AnonCredsRevocationRegistryDefinitionRepository,
  AnonCredsSchemaRepository,
} from '@credo-ts/anoncreds'
import { DidDocument, DidDocumentService, JsonTransformer, parseDid } from '@credo-ts/core'
import { Controller, Get, Param, Res, HttpStatus, HttpException, Inject } from '@nestjs/common'
import { DIDLog } from 'didwebvh-ts'
import { Response } from 'express'
import * as fs from 'fs'

import { baseFilePath, tailsIndex, VsAgentService } from '../../../services'
import { VsAgent } from '../../../utils/VsAgent'
import { getWebDid } from '../../../utils/agent'

@Controller()
export class DidWebController {
  constructor(
    private readonly agentService: VsAgentService,
    @Inject('PUBLIC_API_BASE_URL') private readonly publicApiBaseUrl: string,
  ) {}

  @Get('/.well-known/did.json')
  async getDidDocument() {
    const agent = await this.agentService.getAgent()
    agent.config.logger.debug(`Public DID document requested`)
    const { didDocument } = await resolveDidDocumentData(agent)

    if (didDocument) {
      const parsedDid = parseDid(didDocument.id)

      if (parsedDid.method === 'web') return didDocument

      // In case of did:webvh, we'll need to add some steps to publish a did:web, as per
      // https://identity.foundation/didwebvh/v1.0/#publishing-a-parallel-didweb-did
      if (parsedDid.method === 'webvh' && parsedDid.id.includes(':')) {
        const scid = parsedDid.id.split(':')[0]

        // Start with resolved version of the DIDDoc from did:webvh
        const legacyDidDocument = new DidDocument(didDocument)

        // We add the legacy did:web AnonCreds service (important in case the agent had previously did:web objects)
        legacyDidDocument.service = [
          ...(legacyDidDocument.service ?? []),
          new DidDocumentService({
            id: `${didDocument.id}#anoncreds`,
            serviceEndpoint: `${this.publicApiBaseUrl}/anoncreds/v1`,
            type: 'AnonCredsRegistry',
          }),
        ]

        // Execute text replacement: did:webvh:<scid> by did:web
        const stringified = JSON.stringify(legacyDidDocument.toJSON())
        const replaced = stringified.replace(new RegExp(`did:webvh:${scid}`, 'g'), 'did:web')

        return new DidDocument({
          ...JsonTransformer.fromJSON(JSON.parse(replaced), DidDocument),
          // Update alsoKnownAs
          alsoKnownAs: [parsedDid.did],
        })
      }
    }

    // Neither did:web nor did:webvh
    throw new HttpException('DID Document not found', HttpStatus.NOT_FOUND)
  }

  @Get('/.well-known/did.jsonl')
  async getDidLog(@Res() res: Response) {
    const agent = await this.agentService.getAgent()
    agent.config.logger.debug(`Public DID log requested`)
    const { didLog } = await resolveDidDocumentData(agent)

    if (didLog) {
      res.setHeader('Content-Type', 'application/jsonl; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache')
      res.send(didLog)
    } else {
      throw new HttpException('DID Log not found', HttpStatus.NOT_FOUND)
    }
  }

  // AnonCreds routes only make sense if we have a public DID (otherwise, we cannot be issuers)
  // Schemas
  @Get('/anoncreds/v1/schema/:schemaId')
  async getSchema(@Param('schemaId') schemaId: string, @Res() res: Response) {
    const agent = await this.agentService.getAgent()
    agent.config.logger.debug(`Schema requested: ${schemaId}`)

    const issuerId = await getWebDid(agent)
    if (!issuerId) {
      throw new HttpException('Agent does not have any defined public DID', HttpStatus.NOT_FOUND)
    }

    const schemaRepository = agent.dependencyManager.resolve(AnonCredsSchemaRepository)
    const schemaRecord = await schemaRepository.findBySchemaId(
      agent.context,
      `${issuerId}?service=anoncreds&relativeRef=/schema/${schemaId}`,
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

    const issuerId = await getWebDid(agent)
    if (!issuerId) {
      throw new HttpException('Agent does not have any defined public DID', HttpStatus.NOT_FOUND)
    }

    const credentialDefinitionRepository = agent.dependencyManager.resolve(
      AnonCredsCredentialDefinitionRepository,
    )

    const credentialDefinitionRecord = await credentialDefinitionRepository.findByCredentialDefinitionId(
      agent.context,
      `${issuerId}?service=anoncreds&relativeRef=/credDef/${credentialDefinitionId}`,
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
    const issuerId = await getWebDid(agent)
    if (!issuerId) {
      throw new HttpException('Agent does not have any defined public DID', HttpStatus.NOT_FOUND)
    }

    const revocationDefinitionRepository = agent.dependencyManager.resolve(
      AnonCredsRevocationRegistryDefinitionRepository,
    )

    const revocationDefinitionRecord =
      await revocationDefinitionRepository.findByRevocationRegistryDefinitionId(
        agent.context,
        `${issuerId}?service=anoncreds&relativeRef=/revRegDef/${revocationDefinitionId}`,
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

    const issuerId = await getWebDid(agent)
    if (!issuerId) {
      throw new HttpException('Agent does not have any defined public DID', HttpStatus.NOT_FOUND)
    }

    const revocationDefinitionRepository = agent.dependencyManager.resolve(
      AnonCredsRevocationRegistryDefinitionRepository,
    )

    const revocationDefinitionRecord =
      await revocationDefinitionRepository.findByRevocationRegistryDefinitionId(
        agent.context,
        `${issuerId}?service=anoncreds&relativeRef=/revRegDef/${revocationDefinitionId}`,
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

async function resolveDidDocumentData(agent: VsAgent) {
  if (!agent.did) return {}

  const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })

  if (!didRecord) {
    throw new HttpException('DID Document not found', HttpStatus.NOT_FOUND)
  }

  const didDocument = didRecord.didDocument

  const didLog = didRecord.metadata.get('log') as DIDLog[] | null

  return { didDocument, didLog: didLog?.map(entry => JSON.stringify(entry)).join('\n') }
}
