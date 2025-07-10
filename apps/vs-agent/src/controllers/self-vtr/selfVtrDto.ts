import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsIn,
  MaxLength,
  IsUrl,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsDateString,
  IsOptional,
} from 'class-validator'

export class OrganizationCredentialDto {
  @ApiProperty({ example: 'Example Organization' })
  @IsString()
  @MaxLength(256)
  name!: string

  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
    description: 'PNG image as base64 string',
  })
  @IsString()
  logo!: string

  @ApiProperty({ example: 'test registry' })
  @IsString()
  @MaxLength(256)
  registryId!: string

  @ApiProperty({ example: 'https://example.com/organization' })
  @IsString()
  @MaxLength(256)
  registryUrl!: string

  @ApiProperty({ example: '123 Main St, Anytown, USA' })
  @IsString()
  @MaxLength(1024)
  address!: string

  @ApiProperty({ enum: ['PUBLIC', 'PRIVATE', 'FOUNDATION'] })
  @IsIn(['PUBLIC', 'PRIVATE', 'FOUNDATION'])
  type!: string

  @ApiProperty({ maxLength: 2, example: 'US' })
  @IsString()
  countryCode!: string
}

export class PersonCredentialDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @MaxLength(256)
  @IsOptional()
  firstName?: string

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MaxLength(256)
  lastName!: string

  @ApiPropertyOptional({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
    description: 'PNG image as base64 string',
  })
  @IsString()
  @IsOptional()
  avatar?: string

  @ApiProperty({ format: 'date' })
  @IsDateString()
  birthDate!: string

  @ApiProperty({ maxLength: 2, example: 'US' })
  @IsString()
  countryOfResidence!: string
}

export class ServiceCredentialDto {
  @ApiProperty({ example: 'Example Service' })
  @IsString()
  @MaxLength(512)
  name!: string

  @ApiProperty({ example: 'service' })
  @IsString()
  @MaxLength(128)
  type!: string

  @ApiProperty({ example: 'This is an example service description.' })
  @IsString()
  @MaxLength(4096)
  description!: string

  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
    description: 'PNG image as base64 string',
  })
  @IsString()
  logo!: string

  @ApiProperty({ minimum: 0, maximum: 149, example: 18 })
  @IsNumber()
  @Min(0)
  @Max(149)
  minimumAgeRequired!: number

  @ApiProperty({ format: 'uri', example: 'https://example.com/terms' })
  @IsUrl()
  @MaxLength(2048)
  termsAndConditions!: string

  @ApiPropertyOptional({ example: 'abc123' })
  @IsString()
  @IsOptional()
  termsAndConditionsHash?: string

  @ApiProperty({ format: 'uri', example: 'https://example.com/privacy' })
  @IsUrl()
  @MaxLength(2048)
  privacyPolicy!: string

  @ApiPropertyOptional({ example: 'def456' })
  @IsString()
  @IsOptional()
  privacyPolicyHash?: string
}

export class UserAgentCredentialDto {
  @ApiProperty({ example: 'Example User Agent' })
  @IsString()
  @MaxLength(512)
  name!: string

  @ApiProperty({ example: 'This is an example user agent description.' })
  @IsString()
  @MaxLength(4096)
  description!: string

  @ApiProperty({ example: 'test category' })
  @IsString()
  @MaxLength(128)
  category!: string

  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
    description: 'PNG image as base64 string',
  })
  @IsString()
  logo!: string

  @ApiProperty({ example: true })
  @IsBoolean()
  wallet!: boolean

  @ApiProperty({ format: 'uri', example: 'https://example.com/user-agent' })
  @IsUrl()
  @MaxLength(2048)
  termsAndConditions!: string

  @ApiPropertyOptional({ example: 'abc123' })
  @IsString()
  @IsOptional()
  termsAndConditionsHash?: string

  @ApiProperty({ format: 'uri', example: 'https://example.com/terms' })
  @IsUrl()
  @MaxLength(2048)
  privacyPolicy!: string

  @ApiPropertyOptional({ example: 'def456' })
  @IsString()
  @IsOptional()
  privacyPolicyHash?: string
}
