import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator'

export class CreateRevocationRegistryDto {
  @ApiProperty({
    description: 'credentialDefinitionId',
    example:
      'did:web:chatbot-demo.dev.2060.io?service=anoncreds&relativeRef=/credDef/8TsGLaSPVKPVMXK8APzBRcXZryxutvQuZnnTcDmbqd9p',
  })
  @IsString()
  @IsNotEmpty()
  credentialDefinitionId!: string

  @ApiProperty({
    description: 'maximumCredentialNumber',
    default: 1000,
    example: 1000,
  })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  maximumCredentialNumber: number = 1000
}
