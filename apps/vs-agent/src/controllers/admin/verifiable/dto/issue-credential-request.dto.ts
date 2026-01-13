import { JsonObject } from '@credo-ts/core'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, IsUrl, Matches, IsObject, IsOptional } from 'class-validator'

/**
 * DTO used to request the issuance of a Verifiable Credential.
 */
export class IssueCredentialRequestDto {
  @ApiProperty({
    description:
      'Format of credential to issue: json-ld (for public entities) or "anoncreds" (for best privacy, usually for end-users)',
    example: 'jsonld',
    enum: ['jsonld', 'anoncreds'],
  })
  @IsString()
  @IsNotEmpty()
  format!: 'jsonld' | 'anoncreds'

  @ApiProperty({
    description: 'DID of the credential subject (the holder)',
    example: 'did:example:holder123',
  })
  @IsString()
  @IsOptional()
  @Matches(/^did:[a-z0-9]+:[a-zA-Z0-9.\-_:/%]+$/, {
    message: 'Invalid DID format',
  })
  did?: string

  @ApiProperty({
    description: 'URL of the JSON Credential Schema that defines the credential structure',
    example: 'https://example.org/schemas/example-service.json',
  })
  @IsString()
  @IsUrl({}, { message: 'json credential schema must be a valid URL' })
  @IsNotEmpty()
  jsonSchemaCredentialId!: string

  @ApiProperty({
    description: 'Credential claims represented as flat key-value pairs',
    example: {
      serviceName: 'Example Service',
      serviceRole: 'Verifier',
      active: true,
    },
  })
  @IsObject()
  @IsNotEmpty()
  claims!: JsonObject
}
