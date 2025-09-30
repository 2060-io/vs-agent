import { ApiProperty } from '@nestjs/swagger'
import { RequestedCredential, Claim } from '@2060.io/vs-agent-model'

export class PresentationDataDto {
  @ApiProperty({
    type: [Object],
    description: 'List of requested credentials, with their definition IDs and attributes',
    example: [
      {
        credentialDefinitionId: 'did:web:issuer…/credDef/123',
        attributes: ['firstName', 'age'],
      },
    ],
  })
  requestedCredentials!: RequestedCredential[]

  @ApiProperty({
    type: [Object],
    description: 'List of revealed claims from the presentation',
    example: [
      { name: 'firstName', value: 'Alice' },
      { name: 'age', value: '30' },
    ],
  })
  claims!: Claim[]

  @ApiProperty({ description: 'Whether the presentation was cryptographically verified', example: true })
  verified!: boolean

  @ApiProperty({ description: 'Current proof-exchange state', example: 'done' })
  state!: string

  @ApiProperty({ description: 'Identifier of the proof exchange', example: 'proof-1234-5678' })
  proofExchangeId!: string

  @ApiProperty({ description: 'DIDComm thread identifier', example: 'thread-8765-4321' })
  threadId!: string

  @ApiProperty({
    description: 'Timestamp of last update',
    example: '2025-07-15T12:34:56.000Z',
    type: String,
    format: 'date-time',
  })
  updatedAt!: string
}
