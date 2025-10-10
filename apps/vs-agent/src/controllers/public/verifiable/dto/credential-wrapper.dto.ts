import { ApiProperty, getSchemaPath } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { ValidateNested, IsEnum } from 'class-validator'

import { ECS_SCHEMA_KEYS } from '../../../../config/constants'

import { OrganizationCredentialDto } from './ecs-org.dto'
import { ServiceCredentialDto } from './ecs-service.dto'

/**
 * Data Transfer Object Wrapper for essentials schemas.
 */
export class CredentialWrapperDto {
  @ApiProperty({ enum: ECS_SCHEMA_KEYS })
  @IsEnum(ECS_SCHEMA_KEYS)
  credentialType!: (typeof ECS_SCHEMA_KEYS)[number]

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(OrganizationCredentialDto) },
      { $ref: getSchemaPath(ServiceCredentialDto) },
    ],
  })
  @ValidateNested()
  @Type(() => Object)
  @Transform(({ value, obj }) => {
    switch (obj.credentialType) {
      case 'ecs-org':
        return Object.assign(new OrganizationCredentialDto(), value)
      case 'ecs-service':
        return Object.assign(new ServiceCredentialDto(), value)
      default:
        return value
    }
  })
  credential!: OrganizationCredentialDto | ServiceCredentialDto
}
