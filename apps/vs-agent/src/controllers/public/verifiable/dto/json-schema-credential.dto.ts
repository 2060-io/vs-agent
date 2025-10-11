import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsUrl, IsOptional } from 'class-validator'

/**
 * Data Transfer Object JsonSchemaCredential.
 */
export class JsonSchemaCredentialDto {
  @ApiProperty({
    description: 'The URL identifier of the credential schema.',
    example: 'https://p2801.ovpndev.mobiera.io/self-tr/schemas-example-service.json',
  })
  @IsUrl()
  id!: string

  @ApiPropertyOptional({
    description:
      'Optional URL to the JSON Schema definition. ' +
      'If omitted, it will be treated as a self essential schema (' +
      '`schemas-example-service.json`).',
    example: 'https://p2801.ovpndev.mobiera.io/self-tr/cs/v1/js/ecs-service',
  })
  @IsOptional()
  @IsUrl()
  jsonSchemaRef?: string
}
