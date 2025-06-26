import { AnonCredsProofRequest } from '@credo-ts/anoncreds'
import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsNotEmpty } from 'class-validator'

export class PresentProofCreateDto {
  @ApiProperty({
    description: 'Proof Request',
    example: 'TODO',
  })
  @IsNotEmpty()
  @Expose({ name: 'proof_request' })
  proof_request!: AnonCredsProofRequest
}

export type PresentProofCreateResult = {
  thread_id: string
  presentation_exchange_id: string
  presentation_request: Record<string, unknown>
}
