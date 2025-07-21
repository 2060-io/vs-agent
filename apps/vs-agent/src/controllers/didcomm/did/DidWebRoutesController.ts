import {
  AnonCredsCredentialDefinitionRepository,
  AnonCredsRevocationRegistryDefinitionRepository,
  AnonCredsSchemaRepository,
} from '@credo-ts/anoncreds'
import {
  Controller,
  Get,
  Param,
  Res,
  Put,
  UploadedFile,
  UseInterceptors,
  HttpStatus,
  HttpException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { createHash } from 'crypto'
import { Response } from 'express'
import * as fs from 'fs'
import { diskStorage } from 'multer'

import { PUBLIC_API_BASE_URL } from '../../../config/constants'
import { VsAgentService } from '../../../services/VsAgentService'

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

@Controller()
export class DidWebController {
  constructor(private readonly agentService: VsAgentService) {}

  @Get('/.well-known/did.json')
  async getDidDocument() {
    const agent = await this.agentService.getAgent()
    agent.config.logger.info(`Public DidDocument requested`)
    if (agent.did) {
      const [didRecord] = await agent.dids.getCreatedDids({ did: agent.did })
      const didDocument = didRecord.didDocument
      if (didDocument) {
        return didDocument
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
          statusListEndpoint: `${PUBLIC_API_BASE_URL}/anoncreds/v1/revStatus/${revocationDefinitionId}`,
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

  // Endpoint to upload a tails file for a specific tailsFileId
  @Put('/anoncreds/v1/tails/:tailsFileId')
  @UseInterceptors(FileInterceptor('file', { storage: fileStorage }))
  async uploadTailsFile(
    @Param('tailsFileId') tailsFileId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const agent = await this.agentService.getAgent()
    agent.config.logger.info(`tails file upload: ${tailsFileId}`)

    if (!file) {
      agent.config.logger.info(`No file found with id: ${tailsFileId}`)
      throw new HttpException(`No files were uploaded`, HttpStatus.NOT_FOUND)
    }

    if (!tailsFileId) {
      // Clean up temporary file
      fs.rmSync(file.path)
      throw new HttpException('Missing tailsFileId', HttpStatus.CONFLICT)
    }

    const item = tailsIndex[tailsFileId]

    if (item) {
      agent.config.logger.debug(`there is already an entry for: ${tailsFileId}`)
      throw new HttpException(`there is already an entry for: ${tailsFileId}`, HttpStatus.CONFLICT)
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
  }
}
