import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsNotEmpty,
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

export class BaseCredentialDto {
  @ApiProperty({ format: 'uri', example: 'did:example:123' })
  @IsString()
  @IsNotEmpty()
  id!: string
}

export class OrganizationCredentialDto extends BaseCredentialDto {
  @ApiProperty()
  @IsString()
  @MaxLength(256)
  name!: string

  @ApiProperty({ description: 'PNG image as base64 string' })
  @IsString()
  logo!: string

  @ApiProperty()
  @IsString()
  @MaxLength(256)
  registryId!: string

  @ApiProperty()
  @IsString()
  @MaxLength(256)
  registryUrl!: string

  @ApiProperty()
  @IsString()
  @MaxLength(1024)
  address!: string

  @ApiProperty({ enum: ['PUBLIC', 'PRIVATE', 'FOUNDATION'] })
  @IsIn(['PUBLIC', 'PRIVATE', 'FOUNDATION'])
  type!: string

  @ApiProperty({ maxLength: 2 })
  @IsString()
  countryCode!: string
}

export class PersonCredentialDto extends BaseCredentialDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(256)
  @IsOptional()
  firstName?: string

  @ApiProperty()
  @IsString()
  @MaxLength(256)
  lastName!: string

  @ApiPropertyOptional({ description: 'PNG image as base64 string' })
  @IsString()
  @IsOptional()
  avatar?: string

  @ApiProperty({ format: 'date' })
  @IsDateString()
  birthDate!: string

  @ApiProperty({ maxLength: 2 })
  @IsString()
  countryOfResidence!: string
}

export class ServiceCredentialDto extends BaseCredentialDto {
  @ApiProperty()
  @IsString()
  @MaxLength(512)
  name!: string

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  type!: string

  @ApiProperty()
  @IsString()
  @MaxLength(4096)
  description!: string

  @ApiProperty({ description: 'PNG image as base64 string' })
  @IsString()
  logo!: string

  @ApiProperty({ minimum: 0, maximum: 149 })
  @IsNumber()
  @Min(0)
  @Max(149)
  minimumAgeRequired!: number

  @ApiProperty({ format: 'uri' })
  @IsUrl()
  @MaxLength(2048)
  termsAndConditions!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  termsAndConditionsHash?: string

  @ApiProperty({ format: 'uri' })
  @IsUrl()
  @MaxLength(2048)
  privacyPolicy!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  privacyPolicyHash?: string
}

export class UserAgentCredentialDto extends BaseCredentialDto {
  @ApiProperty()
  @IsString()
  @MaxLength(512)
  name!: string

  @ApiProperty()
  @IsString()
  @MaxLength(4096)
  description!: string

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  category!: string

  @ApiProperty({ description: 'PNG image as base64 string' })
  @IsString()
  logo!: string

  @ApiProperty()
  @IsBoolean()
  wallet!: boolean

  @ApiProperty({ format: 'uri' })
  @IsUrl()
  @MaxLength(2048)
  termsAndConditions!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  termsAndConditionsHash?: string

  @ApiProperty({ format: 'uri' })
  @IsUrl()
  @MaxLength(2048)
  privacyPolicy!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  privacyPolicyHash?: string
}
