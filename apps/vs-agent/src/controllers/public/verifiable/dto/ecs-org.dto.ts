import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsUrl, IsEnum, Length } from 'class-validator'

/**
 * Data Transfer Object for Organization essential schema.
 */
export class OrganizationCredentialDto {
  @ApiProperty({
    description: 'Unique identifier of the organization (URI format)',
    example: 'https://example.com/organizations/123',
  })
  @IsUrl()
  id!: string

  @ApiProperty({
    description: 'Organization name',
    minLength: 0,
    maxLength: 256,
    example: 'OpenAI Research',
  })
  @IsString()
  @Length(0, 256)
  name!: string

  @ApiProperty({
    description: 'Base64 encoded logo of the organization',
    example: 'iVBORw0KGgoAAAANSUhEUgAAA...',
  })
  @IsString()
  logo!: string

  @ApiProperty({
    description: 'Registry ID of the organization',
    minLength: 0,
    maxLength: 256,
    example: 'ORG-987654',
  })
  @IsString()
  @Length(0, 256)
  registryId!: string

  @ApiProperty({
    description: 'Registry URL of the organization',
    minLength: 0,
    maxLength: 256,
    example: 'https://registry.example.com/orgs/987654',
  })
  @IsString()
  @Length(0, 256)
  registryUrl!: string

  @ApiProperty({
    description: 'Physical address of the organization',
    minLength: 0,
    maxLength: 1024,
    example: '123 Innovation Street, San Francisco, CA, USA',
  })
  @IsString()
  @Length(0, 1024)
  address!: string

  @ApiProperty({
    description: 'Type of the organization',
    enum: ['PUBLIC', 'PRIVATE', 'FOUNDATION'],
    example: 'PRIVATE',
  })
  @IsEnum(['PUBLIC', 'PRIVATE', 'FOUNDATION'])
  type!: 'PUBLIC' | 'PRIVATE' | 'FOUNDATION'

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    minLength: 2,
    maxLength: 2,
    example: 'US',
  })
  @IsString()
  @Length(2, 2)
  countryCode!: string
}
