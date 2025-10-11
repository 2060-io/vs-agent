import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsUrl, IsNumber, IsOptional, Length, MaxLength } from 'class-validator'

/**
 * Data Transfer Object for Service essential schema.
 */
export class ServiceCredentialDto {
  @ApiProperty({
    description: 'Unique identifier of the service (URI format)',
    example: 'https://example.com/services/123',
  })
  @IsUrl()
  id!: string

  @ApiProperty({
    description: 'Service name',
    minLength: 1,
    maxLength: 512,
    example: 'Streaming Platform',
  })
  @IsString()
  @Length(1, 512)
  name!: string

  @ApiProperty({
    description: 'Type of the service',
    minLength: 1,
    maxLength: 128,
    example: 'VIDEO_STREAMING',
  })
  @IsString()
  @Length(1, 128)
  type!: string

  @ApiProperty({
    description: 'Service description',
    maxLength: 4096,
    example: 'A platform that provides live and on-demand video streaming.',
  })
  @IsString()
  @MaxLength(4096)
  description!: string

  @ApiProperty({
    description: 'URL logo of the organization',
    example: 'https://example.com/logos/org-logo.png',
  })
  @IsUrl()
  logo!: string

  @ApiProperty({
    description: 'Minimum age required to use the service',
    minimum: 0,
    maximum: 150,
    example: 18,
  })
  @IsNumber()
  minimumAgeRequired!: number

  @ApiProperty({
    description: 'URL of the terms and conditions',
    maxLength: 2048,
    example: 'https://example.com/terms',
  })
  @IsUrl()
  @MaxLength(2048)
  termsAndConditions!: string

  @ApiPropertyOptional({
    description: 'Hash of the terms and conditions document',
    example: '9a0364b9e99bb480dd25e1f0284c8555',
  })
  @IsOptional()
  @IsString()
  termsAndConditionsHash?: string

  @ApiProperty({
    description: 'URL of the privacy policy',
    maxLength: 2048,
    example: 'https://example.com/privacy',
  })
  @IsUrl()
  @MaxLength(2048)
  privacyPolicy!: string

  @ApiPropertyOptional({
    description: 'Hash of the privacy policy document',
    example: 'ab56b4d92b40713acc5af89985d4b786',
  })
  @IsOptional()
  @IsString()
  privacyPolicyHash?: string
}
