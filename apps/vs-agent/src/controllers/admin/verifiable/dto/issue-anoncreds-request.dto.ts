import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, Matches } from 'class-validator'

/**
 * DTO used to request the issuance of an AnonCreds Credential.
 */
export class IssueAnonCredsRequestDto {
  @ApiProperty({
    description: 'DID of the credential subject (the holder)',
    example: 'did:example:holder123',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^did:[a-z0-9]+:[a-zA-Z0-9.\-_:/%]+$/, {
    message: 'Invalid DID format',
  })
  did!: string

  @ApiProperty({
    description: 'URL of the JSON Schema that defines the credential structure',
    example: 'vpr:verana:mainnet/cs/v1/js/12345678',
  })
  @IsString()
  @IsNotEmpty()
  jsonSchema!: string
}
