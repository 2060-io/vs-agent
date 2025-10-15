import { ApiProperty, getSchemaPath } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator'

import { IssueAnonCredsRequestDto } from './issue-anoncreds-request.dto'
import { IssueW3cJsonLdRequestDto } from './issue-w3c-json-ld-request.dto'

/**
 * Wrapper DTO that accepts either W3C or AnonCreds credential requests.
 */
export class IssueCredentialWrapperDto {
  @ApiProperty({
    description: 'Type of credential to issue: "w3c" or "anoncreds"',
    example: 'jsonld',
    enum: ['jsonld', 'anoncreds'],
  })
  @IsString()
  @IsNotEmpty()
  type!: 'jsonld' | 'anoncreds'

  @ValidateNested()
  @Type(() => Object)
  @Transform(({ value, obj }) => {
    switch (obj.type) {
      case 'jsonld':
        return Object.assign(new IssueW3cJsonLdRequestDto(), value)
      case 'anoncreds':
        return Object.assign(new IssueAnonCredsRequestDto(), value)
      default:
        return value
    }
  })
  credential!: IssueW3cJsonLdRequestDto | IssueAnonCredsRequestDto
}
