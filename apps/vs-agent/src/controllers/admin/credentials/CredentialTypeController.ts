import {
  CredentialTypeInfo,
  CredentialTypeResult,
  ImportCredentialTypeOptions,
} from '@2060.io/vs-agent-model'
import {
  AnonCredsCredentialDefinition,
  AnonCredsCredentialDefinitionPrivateRecord,
  AnonCredsCredentialDefinitionPrivateRepository,
  AnonCredsCredentialDefinitionRecord,
  AnonCredsCredentialDefinitionRepository,
  AnonCredsKeyCorrectnessProofRecord,
  AnonCredsKeyCorrectnessProofRepository,
  AnonCredsRevocationRegistryDefinitionRepository,
  AnonCredsSchema,
  AnonCredsSchemaRecord,
  AnonCredsSchemaRepository,
} from '@credo-ts/anoncreds'
import { utils } from '@credo-ts/core'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBody, ApiTags } from '@nestjs/swagger'

import { VsAgentService } from '../../../services/VsAgentService'

import { CreateRevocationRegistryDto } from './CreateRevocationRegistryDto'
import { CreateCredentialTypeDto } from './CredentialTypeDto'

@ApiTags('credential-types')
@Controller({
  path: 'credential-types',
  version: '1',
})
export class CredentialTypesController {
  private readonly logger = new Logger(CredentialTypesController.name)

  constructor(private readonly agentService: VsAgentService) {}

  /**
   * Get all created credential types
   *
   * @returns
   */
  @Get('/')
  public async getAllCredentialTypes(): Promise<CredentialTypeResult[]> {
    const agent = await this.agentService.getAgent()

    const credentialDefinitions = await agent.modules.anoncreds.getCreatedCredentialDefinitions({})

    return Promise.all(
      credentialDefinitions.map(async record => {
        const schemaResult = await agent.modules.anoncreds.getSchema(record.credentialDefinition.schemaId)

        const schema = schemaResult.schema
        const revocationSupported = record.credentialDefinition?.value?.revocation !== undefined

        return {
          id: record.credentialDefinitionId,
          name: (record.getTag('name') as string) ?? schema?.name,
          version: (record.getTag('version') as string) ?? schema?.version,
          attributes: schema?.attrNames || [],
          revocationSupported,
        }
      }),
    )
  }

  /**
   * Create a new credential type
   *
   * @param options
   * @returns CredentialTypeInfo
   */
  @Post('/')
  @ApiBody({
    type: CreateCredentialTypeDto,
    examples: {
      example: {
        summary: 'Phone Number',
        value: {
          name: 'phoneNumber',
          version: '1.0',
          attributes: ['phoneNumber'],
        },
      },
    },
  })
  public async createCredentialType(@Body() options: CreateCredentialTypeDto): Promise<CredentialTypeInfo> {
    try {
      const agent = await this.agentService.getAgent()

      let schemaId: string | undefined
      let schema: AnonCredsSchema | undefined

      const issuerId = agent.did
      if (!issuerId) {
        throw new Error('Agent does not have any defined public DID')
      }

      if (options.schemaId) {
        const schemaState = await agent.modules.anoncreds.getSchema(options.schemaId)

        if (!schemaState.schema) {
          throw new Error('Specified schema has not been found')
        }
        schemaId = schemaState.schemaId
        schema = schemaState.schema
      } else {
        // No schema specified. A new one will be created
        const { schemaState } = await agent.modules.anoncreds.registerSchema({
          schema: {
            attrNames: options.attributes,
            name: options.name,
            version: options.version,
            issuerId,
          },
          options: {},
        })

        this.logger.debug!(`schemaState: ${JSON.stringify(schemaState)}`)
        schemaId = schemaState.schemaId
        schema = schemaState.schema

        if (!schemaId || !schema) {
          throw new Error('Schema for the credential definition could not be created')
        }
      }

      const registrationResult = await agent.modules.anoncreds.registerCredentialDefinition({
        credentialDefinition: { issuerId, schemaId, tag: `${options.name}.${options.version}` },
        options: { supportRevocation: options.supportRevocation },
      })

      const credentialDefinitionId = registrationResult.credentialDefinitionState.credentialDefinitionId
      this.logger.debug!(
        `credentialDefinitionState: ${JSON.stringify(registrationResult.credentialDefinitionState)}`,
      )

      if (!credentialDefinitionId) {
        throw new Error(
          `Cannot create credential definition: ${JSON.stringify(registrationResult.registrationMetadata)}`,
        )
      }

      this.logger.log(`Credential Definition Id: ${credentialDefinitionId}`)

      // Apply name and version as tags
      const credentialDefinitionRepository = agent.dependencyManager.resolve(
        AnonCredsCredentialDefinitionRepository,
      )
      const credentialDefinitionRecord = await credentialDefinitionRepository.getByCredentialDefinitionId(
        agent.context,
        credentialDefinitionId,
      )
      credentialDefinitionRecord.setTag('name', options.name)
      credentialDefinitionRecord.setTag('version', options.version)

      await credentialDefinitionRepository.update(agent.context, credentialDefinitionRecord)

      return {
        id: credentialDefinitionId,
        attributes: schema.attrNames,
        name: options.name,
        version: options.version,
        schemaId,
      }
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `something went wrong: ${error}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      )
    }
  }

  /**
   * Delete a credential type, including its underlying cryptographic data
   *
   * @param credentialTypeId Credential Type Id
   * @returns ConnectionRecord
   */
  @Delete('/:credentialTypeId')
  public async deleteCredentialTypeById(@Param('credentialTypeId') credentialTypeId: string) {
    const agent = await this.agentService.getAgent()

    const credentialDefinitionRepository = agent.dependencyManager.resolve(
      AnonCredsCredentialDefinitionRepository,
    )
    const credentialDefinitionPrivateRepository = agent.dependencyManager.resolve(
      AnonCredsCredentialDefinitionPrivateRepository,
    )
    const keyCorrectnessProofRepository = agent.dependencyManager.resolve(
      AnonCredsKeyCorrectnessProofRepository,
    )

    const credentialDefinitionRecord = await credentialDefinitionRepository.findByCredentialDefinitionId(
      agent.context,
      credentialTypeId,
    )
    if (!credentialDefinitionRecord)
      throw new NotFoundException({ reason: `credential type with id "${credentialTypeId}" not found.` })

    // Delete private data
    const credDefPrivRecord = await credentialDefinitionPrivateRepository.getByCredentialDefinitionId(
      agent.context,
      credentialTypeId,
    )
    await credentialDefinitionPrivateRepository.delete(agent.context, credDefPrivRecord)

    const keyCorrectnessProofRecord = await keyCorrectnessProofRepository.getByCredentialDefinitionId(
      agent.context,
      credentialTypeId,
    )
    await keyCorrectnessProofRepository.delete(agent.context, keyCorrectnessProofRecord)

    // Delete public data
    await credentialDefinitionRepository.delete(agent.context, credentialDefinitionRecord)

    // TODO: shall we delete also schema?
  }

  /**
   * Export a credential type, including its underlying cryptographic data for importing it in another instance
   *
   * @param credentialTypeId Credential Type Id
   * @returns ConnectionRecord
   */
  @Get('/export/:credentialTypeId')
  public async exportCredentialTypeById(@Param('credentialTypeId') credentialTypeId: string) {
    const agent = await this.agentService.getAgent()

    const credentialDefinitionRepository = agent.dependencyManager.resolve(
      AnonCredsCredentialDefinitionRepository,
    )
    const credentialDefinitionPrivateRepository = agent.dependencyManager.resolve(
      AnonCredsCredentialDefinitionPrivateRepository,
    )
    const keyCorrectnessProofRepository = agent.dependencyManager.resolve(
      AnonCredsKeyCorrectnessProofRepository,
    )
    const schemaRepository = agent.dependencyManager.resolve(AnonCredsSchemaRepository)

    const credentialDefinitionRecord = await credentialDefinitionRepository.findByCredentialDefinitionId(
      agent.context,
      credentialTypeId,
    )

    if (!credentialDefinitionRecord)
      throw new NotFoundException({ reason: `credential type with id "${credentialTypeId}" not found.` })

    return {
      id: credentialTypeId,
      data: {
        name: credentialDefinitionRecord.getTag('name'),
        version: credentialDefinitionRecord.getTag('version'),
        credentialDefinition: credentialDefinitionRecord.credentialDefinition,
        credentialDefinitionPrivate: (
          await credentialDefinitionPrivateRepository.getByCredentialDefinitionId(
            agent.context,
            credentialTypeId,
          )
        ).value,
        keyCorrectnessProof: (
          await keyCorrectnessProofRepository.getByCredentialDefinitionId(agent.context, credentialTypeId)
        ).value,
        schema: (
          await schemaRepository.findBySchemaId(
            agent.context,
            credentialDefinitionRecord.credentialDefinition.schemaId,
          )
        )?.schema,
      },
    }
  }

  /**
   * Create a new credential type
   *
   * @param options
   * @returns CredentialExchangeRecord
   */
  @Post('/import')
  public async importCredentialType(
    @Body() options: ImportCredentialTypeOptions,
  ): Promise<CredentialTypeInfo> {
    const agent = await this.agentService.getAgent()

    try {
      const credentialDefinitionRepository = agent.dependencyManager.resolve(
        AnonCredsCredentialDefinitionRepository,
      )
      const credentialDefinitionPrivateRepository = agent.dependencyManager.resolve(
        AnonCredsCredentialDefinitionPrivateRepository,
      )
      const keyCorrectnessProofRepository = agent.dependencyManager.resolve(
        AnonCredsKeyCorrectnessProofRepository,
      )
      const schemaRepository = agent.dependencyManager.resolve(AnonCredsSchemaRepository)

      if (await credentialDefinitionRepository.findByCredentialDefinitionId(agent.context, options.id)) {
        throw new Error('Credential type already exists')
      }

      if (!agent.did) {
        throw new Error('Agent does not have any defined public DID')
      }

      const credentialDefinition = options.data
        .credentialDefinition as unknown as AnonCredsCredentialDefinition
      let schema = options.data.schema ? (options.data.schema as unknown as AnonCredsSchema) : undefined

      if (!schema) {
        // No schema specified. It must be retrieved from elsewhere
        const schemaState = await agent.modules.anoncreds.getSchema(credentialDefinition.schemaId)

        schema = schemaState.schema

        if (!schema) {
          throw new Error('Schema for given credential type has not been found')
        }
      }

      const existingSchemaRecord = await schemaRepository.findBySchemaId(
        agent.context,
        credentialDefinition.schemaId,
      )

      let schemaRecordId = existingSchemaRecord?.id
      if (!existingSchemaRecord) {
        schemaRecordId = utils.uuid()
        await schemaRepository.save(
          agent.context,
          new AnonCredsSchemaRecord({
            methodName: 'web',
            schema,
            schemaId: credentialDefinition.schemaId,
            id: schemaRecordId,
          }),
        )
      }
      const schemaRecord = await schemaRepository.getById(agent.context, schemaRecordId!)
      schemaRecord.setTag('schemaId', credentialDefinition.schemaId)
      await schemaRepository.update(agent.context, schemaRecord)

      const credentialDefinitionRecordId = utils.uuid()
      await credentialDefinitionRepository.save(
        agent.context,
        new AnonCredsCredentialDefinitionRecord({
          methodName: 'web',
          credentialDefinition,
          credentialDefinitionId: options.id,
          id: credentialDefinitionRecordId,
        }),
      )
      const credentialDefinitionRecord = await credentialDefinitionRepository.getById(
        agent.context,
        credentialDefinitionRecordId,
      )

      // Apply name and version as tags
      credentialDefinitionRecord.setTag('name', options.data.name)
      credentialDefinitionRecord.setTag('version', options.data.version)
      await credentialDefinitionRepository.update(agent.context, credentialDefinitionRecord)

      await credentialDefinitionPrivateRepository.save(
        agent.context,
        new AnonCredsCredentialDefinitionPrivateRecord({
          value: options.data.credentialDefinitionPrivate,
          credentialDefinitionId: options.id,
          id: credentialDefinitionRecordId,
        }),
      )

      await keyCorrectnessProofRepository.save(
        agent.context,
        new AnonCredsKeyCorrectnessProofRecord({
          value: options.data.keyCorrectnessProof,
          credentialDefinitionId: options.id,
          id: credentialDefinitionRecordId,
        }),
      )

      return {
        id: options.id,
        attributes: schema.attrNames,
        name: options.data.name,
        version: options.data.version,
        schemaId: credentialDefinition.schemaId,
      }
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `something went wrong: ${error}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      )
    }
  }

  /**
   * Create a new revocation registry definition
   *
   * @param credentialDefinitionId
   * @returns RevocationTypeInfo
   */
  @Post('/revocationRegistry')
  public async createRevocationRegistry(@Body() options: CreateRevocationRegistryDto): Promise<string> {
    try {
      const agent = await this.agentService.getAgent()
      const credentialDefinitionId = options.credentialDefinitionId

      const cred = await agent.modules.anoncreds.getCredentialDefinition(credentialDefinitionId)

      if (!cred || !cred.credentialDefinition?.value.revocation) {
        throw new Error(
          `No suitable revocation configuration found for the given credentialDefinitionId: ${credentialDefinitionId}`,
        )
      }
      const revocationResult = await agent.modules.anoncreds.registerRevocationRegistryDefinition({
        revocationRegistryDefinition: {
          credentialDefinitionId,
          tag: 'default',
          maximumCredentialNumber: options.maximumCredentialNumber,
          issuerId: cred.credentialDefinition.issuerId,
        },
        options: {},
      })
      const revocationRegistryDefinitionId =
        revocationResult.revocationRegistryDefinitionState.revocationRegistryDefinitionId
      if (!revocationRegistryDefinitionId) {
        throw new Error(
          `Cannot create credential revocations: ${JSON.stringify(revocationResult.registrationMetadata)}`,
        )
      }
      this.logger.debug!(
        `revocationRegistryDefinitionState: ${JSON.stringify(revocationResult.revocationRegistryDefinitionState)}`,
      )

      const revStatusListResult = await agent.modules.anoncreds.registerRevocationStatusList({
        revocationStatusList: {
          issuerId: cred.credentialDefinition.issuerId,
          revocationRegistryDefinitionId: revocationRegistryDefinitionId,
        },
        options: {},
      })
      if (!revStatusListResult.revocationStatusListState.revocationStatusList) {
        throw new Error(`Failed to create revocation status list`)
      }
      const revocationDefinitionRepository = agent.dependencyManager.resolve(
        AnonCredsRevocationRegistryDefinitionRepository,
      )
      const revocationDefinitionRecord =
        await revocationDefinitionRepository.getByRevocationRegistryDefinitionId(
          agent.context,
          revocationRegistryDefinitionId,
        )
      revocationDefinitionRecord.metadata.set(
        'revStatusList',
        revStatusListResult.revocationStatusListState.revocationStatusList,
      )
      await revocationDefinitionRepository.update(agent.context, revocationDefinitionRecord)

      this.logger.log(`Revocation Registry Definition Id: ${revocationRegistryDefinitionId}`)

      return revocationRegistryDefinitionId
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `something went wrong: ${error}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      )
    }
  }

  /**
   * Get all revocation definitions by credentialDefinitionId
   *
   * @returns string[] with revocationRegistryDefinitionIds
   */
  @Get('/revocationRegistry')
  public async getRevocationDefinitions(
    @Query('credentialDefinitionId') credentialDefinitionId?: string,
  ): Promise<string[]> {
    const agent = await this.agentService.getAgent()

    const revocationDefinitionRepository = agent.dependencyManager.resolve(
      AnonCredsRevocationRegistryDefinitionRepository,
    )
    let revocationRegistries
    if (!credentialDefinitionId) {
      revocationRegistries = await revocationDefinitionRepository.getAll(agent.context)
    } else {
      revocationRegistries = await revocationDefinitionRepository.findAllByCredentialDefinitionId(
        agent.context,
        credentialDefinitionId,
      )
    }
    const revocationRegistryDefinitionIds = revocationRegistries.map(
      item => item.revocationRegistryDefinitionId,
    )

    return revocationRegistryDefinitionIds
  }
}
