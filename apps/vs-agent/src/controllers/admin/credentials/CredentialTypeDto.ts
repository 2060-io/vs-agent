import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator'

export class CreateCredentialTypeDto {
  @ApiProperty({
    description: 'Name',
    example: 'myCredentialType',
  })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiProperty({
    description: 'Version',
    example: '1.0',
  })
  @IsString()
  @IsNotEmpty()
  version!: string

  @ApiProperty({
    description: 'Schema attributes',
    example: `['name', 'age']`,
  })
  attributes!: string[]

  @ApiProperty({
    description:
      'Base AnonCreds schema id in case you want to. Note: Deprecated, will be removed in next releases',
    example: 'did:web:issuer#anoncreds?relativeRef=/schema/1234',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  schemaId?: string

  @ApiProperty({
    description: 'Base Verifiable Trust JSON Schema Credential the credential type is based on.',
    example: 'did:web:issuer#anoncreds?relativeRef=/schema/1234',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  relatedJsonSchemaCredentialId?: string

  @ApiProperty({
    description: 'New issuer id in case you want to',
    example: 'did:web:issuer',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  issuerId?: string

  @ApiProperty({
    description:
      'Indicates whether to enable credential revocation support. If enabled, it allows revocation of issued credentials.',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @IsNotEmpty()
  supportRevocation: boolean = false
}
