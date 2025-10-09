import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common'
import { ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiBody, getSchemaPath } from '@nestjs/swagger'

import { TrustService } from './TrustService'
import { CredentialWrapperDto } from './dto'

@ApiTags('Verifiable Trust Credential')
@Controller('vt')
export class TrustController {
  private readonly logger = new Logger(TrustController.name)

  constructor(private readonly trustService: TrustService) {}

  @Get('credentials/:schemaId')
  @ApiOperation({ summary: 'Get all verifiable credentials' })
  @ApiResponse({ status: 200, description: 'List of credentials' })
  async getCredentials(@Param('schemaId') schemaId: string) {
    try {
      return await this.trustService.getSchemaData(schemaId, 'Schema not found')
    } catch (error) {
      this.logger.error(`getCredentials: ${error.message}`)
      throw new HttpException('Failed to get credentials', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('credentials')
  @ApiOperation({ summary: 'Add a new verifiable credential (organization or service)' })
  @ApiBody({
    schema: { $ref: getSchemaPath(CredentialWrapperDto) },
    examples: {
      organization: {
        summary: 'Organization Credential Example',
        value: {
          credentialType: 'ecs-org',
          credential: {
            id: 'https://example.org/org/123',
            name: 'OpenAI Research',
            logo: 'https://example.com/logo.png',
            registryId: 'REG-123',
            registryUrl: 'https://registry.example.org',
            address: '123 Main St, San Francisco, CA',
            type: 'PRIVATE',
            countryCode: 'US',
          },
        },
      },
      service: {
        summary: 'Service Credential Example',
        value: {
          credentialType: 'ecs-service',
          credential: {
            id: 'https://example.org/service/789',
            name: 'AI API',
            type: 'API',
            description: 'Provides advanced AI models',
            logo: 'https://example.com/logo.png',
            minimumAgeRequired: 18,
            termsAndConditions: 'https://example.org/terms',
            privacyPolicy: 'https://example.org/privacy',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Credential created' })
  async updateCredentials(@Body() body: CredentialWrapperDto) {
    try {
      const data = await this.trustService.updateSchemaData(body.credentialType, body.credential)
      return { message: 'Credential updated', data }
    } catch (error) {
      this.logger.error(`updateCredentials: ${error.message}`)
      throw new HttpException('Failed to update credential', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Delete('credentials')
  @ApiOperation({ summary: 'Delete a verifiable credential' })
  @ApiQuery({
    name: 'id',
    required: true,
    type: String,
    description: 'ID of the credential to delete',
    examples: {
      service: { value: 'ecs-service', description: 'Example for ECS Service credential' },
      org: { value: 'ecs-org', description: 'Example for ECS Organization credential' },
    },
  })
  @ApiResponse({ status: 200, description: 'Credential deleted' })
  async removeCredentials(@Query('id') id: string) {
    try {
      return await this.trustService.removeSchemaData(id)
    } catch (error) {
      this.logger.error(`removeCredentials: ${error.message}`)
      throw new HttpException('Failed to delete credential', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get('json-schema-credentials')
  @ApiOperation({ summary: 'Get all JSON schema credentials' })
  @ApiResponse({ status: 200, description: 'List of JSON schema credentials' })
  async getJsonSchemaCredentials() {
    try {
      throw new HttpException({ message: 'This method is not implemented yet' }, HttpStatus.NOT_IMPLEMENTED)
    } catch (error) {
      this.logger.error(`getJsonSchemaCredentials: ${error.message}`)
      throw new HttpException('Failed to get JSON schema credentials', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('json-schema-credentials')
  @ApiOperation({ summary: 'Add a new JSON schema credential' })
  @ApiBody({ schema: { example: { schema: {} } } })
  @ApiResponse({ status: 201, description: 'JSON schema credential created' })
  async createJsonSchemaCredential() {
    try {
      throw new HttpException(
        { message: 'This method is not implemented yet' },
        HttpStatus.NOT_IMPLEMENTED,
      )
    } catch (error) {
      this.logger.error(`createJsonSchemaCredential: ${error.message}`)
      throw new HttpException('Failed to create JSON schema credential', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Delete('json-schema-credentials')
  @ApiOperation({ summary: 'Delete a JSON schema credential' })
  @ApiQuery({ name: 'id', required: true, type: String })
  @ApiResponse({ status: 200, description: 'JSON schema credential deleted' })
  async removeJsonSchemaCredential() {
    try {
      throw new HttpException(
        { message: 'This method is not implemented yet' },
        HttpStatus.NOT_IMPLEMENTED,
      )
    } catch (error) {
      this.logger.error(`removeJsonSchemaCredential: ${error.message}`)
      throw new HttpException('Failed to delete JSON schema credential', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('issue-credential')
  @ApiOperation({ summary: 'Issue a new verifiable credential' })
  @ApiBody({ schema: { example: { subject: 'user-1' } } })
  @ApiResponse({ status: 201, description: 'Credential issued' })
  async issueCredential() {
    try {
      throw new HttpException(
        { message: `This method is not implemented yet` },
        HttpStatus.NOT_IMPLEMENTED,
      )
    } catch (error) {
      this.logger.error(`issueCredential: ${error.message}`)
      throw new HttpException('Failed to issue credential', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('revoke-credential')
  @ApiOperation({ summary: 'Revoke a verifiable credential' })
  @ApiBody({ schema: { example: { id: 'cred-1' } } })
  @ApiResponse({ status: 200, description: 'Credential revoked' })
  async revokeCredential() {
    try {
      throw new HttpException(
        { message: `This method is not implemented yet` },
        HttpStatus.NOT_IMPLEMENTED,
      )
    } catch (error) {
      this.logger.error(`revokeCredential: ${error.message}`)
      throw new HttpException('Failed to revoke credential', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
