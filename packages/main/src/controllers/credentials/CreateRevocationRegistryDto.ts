import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty } from 'class-validator'

export class CreateRevocationRegistryDto {
  @ApiProperty({
    description: 'credentialDefinitionId',
    example: 'did:web',
  })
  @IsString()
  @IsNotEmpty()
  credentialDefinitionId!: string
}
