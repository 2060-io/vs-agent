import { ApiProperty, getSchemaPath } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { ValidateNested, IsEnum } from 'class-validator'

import { OrganizationCredentialDto } from './ecs-org.dto'
import { ServiceCredentialDto } from './ecs-service.dto'

/**
 * Data Transfer Object Wrapper for essentials schemas.
 */
export class CredentialWrapperDto {
  @ApiProperty({ enum: ['ecs-org', 'ecs-service'] })
  @IsEnum(['ecs-org', 'ecs-service'])
  credentialType!: 'ecs-org' | 'ecs-service'

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(OrganizationCredentialDto) },
      { $ref: getSchemaPath(ServiceCredentialDto) },
    ],
  })
  @ValidateNested()
  @Type(() => Object)
  @Transform(({ value, obj }) => {
    if (obj.credentialType === 'ecs-org') {
      return Object.assign(new OrganizationCredentialDto(), value)
    }
    if (obj.credentialType === 'ecs-service') {
      return Object.assign(new ServiceCredentialDto(), value)
    }
    return value
  })
  credential!: OrganizationCredentialDto | ServiceCredentialDto
}
