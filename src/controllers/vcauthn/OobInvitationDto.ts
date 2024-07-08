import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsNotEmpty, IsBoolean } from 'class-validator'

export class AcaPyAttachment {
  id!: string
  type!: string
}

export class OobInvitationDto {
  @ApiProperty({
    description: 'Attachment',
    example: '[{ id: "uuid", type: "present-proof" }]',
  })
  @IsNotEmpty()
  attachments!: AcaPyAttachment[]

  @IsNotEmpty()
  @IsBoolean()
  @Expose({ name: 'use_public_did' })
  usePublicDid!: boolean
}

export type OutOfBandInvitationCreateResult = {
  invi_msg_id: string
  invitation_url: string
  oob_id: string
  trace: boolean
  state: string
  invitation: Record<string, unknown>
}
