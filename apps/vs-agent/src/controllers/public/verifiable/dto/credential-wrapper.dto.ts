import { ApiProperty, getSchemaPath } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { ValidateNested, IsEnum } from 'class-validator'

import { OrganizationCredentialDto } from './ecs-org.dto'
import { ServiceCredentialDto } from './ecs-service.dto'

export class CredentialWrapperDto {
  @ApiProperty({ enum: ['organization', 'service'] })
  @IsEnum(['organization', 'service'])
  credentialType!: 'organization' | 'service'

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(OrganizationCredentialDto) },
      { $ref: getSchemaPath(ServiceCredentialDto) },
    ],
  })
  @ValidateNested()
  @Type(() => Object)
  @Transform(({ value, obj }) => {
    if (obj.credentialType === 'organization') {
      return Object.assign(new OrganizationCredentialDto(), value)
    }
    if (obj.credentialType === 'service') {
      return Object.assign(new ServiceCredentialDto(), value)
    }
    return value
  })
  credential!: OrganizationCredentialDto | ServiceCredentialDto
}
