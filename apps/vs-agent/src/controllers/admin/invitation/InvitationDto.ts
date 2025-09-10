import {
  ClaimOptions,
  CreateCredentialOfferOptions,
  CreatePresentationRequestOptions,
  RequestedCredential,
} from '@2060.io/vs-agent-model'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class CreatePresentationRequestDto implements CreatePresentationRequestOptions {
  @ApiProperty({
    description: 'Optional reference',
    example: '1234-5678',
  })
  ref?: string

  @ApiProperty({
    description: 'URL to be called when flow ends',
    example: 'https://myhost.com/mycallback',
  })
  callbackUrl?: string

  @IsNotEmpty()
  @ApiProperty({
    description: 'Requested credentials',
    example: '[{ credentialDefinitionId: "myCredentialDefinition", attributes: ["name","age"] }]',
  })
  requestedCredentials!: RequestedCredential[]

  @ApiProperty({
    description: 'Use legacy did:web in case of did:webvh',
    example: 'true',
  })
  useLegacyDid?: boolean
}

export class CreateCredentialOfferDto implements CreateCredentialOfferOptions {
  @ApiProperty({
    description: 'Credential Definition Id of the credential type',
    example:
      'did:web:chatbot-demo.dev.2060.io?service=anoncreds&relativeRef=/credDef/8TsGLaSPVKPVMXK8APzBRcXZryxutvQuZnnTcDmbqd9p',
  })
  credentialDefinitionId!: string

  @ApiProperty({
    description: 'Claims in name-value pairs',
    example: '[{ "name": "firstName", "value:" "John" }, { "name: "age", "value: "18" }]',
  })
  @IsNotEmpty()
  claims!: ClaimOptions[]

  @ApiProperty({
    description: 'Use legacy did:web in case of did:webvh',
    example: 'true',
  })
  useLegacyDid?: boolean
}
