import { W3cJsonLdVerifiableCredential } from '@credo-ts/core'
import { Type } from 'class-transformer'
import { IsNotEmpty, ValidateNested } from 'class-validator'

export class W3cCredentialDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => W3cJsonLdVerifiableCredential)
  credential!: W3cJsonLdVerifiableCredential
}
