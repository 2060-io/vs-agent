import type {
  HandshakeProtocol,
  ReceiveOutOfBandInvitationConfig,
  OutOfBandDidCommService,
  ProofState,
  JsonObject,
} from '@credo-ts/core'

import { Claim, ClaimOptions } from './messages/CredentialIssuanceMessage'

export interface VsAgentInfo {
  label: string
  endpoints: string[]
  isInitialized: boolean
  publicDid?: string
}

export interface AgentMessageType {
  '@id': string
  '@type': string
  [key: string]: unknown
}

export interface CreateCredentialTypeOptions {
  name: string
  version: string
  attributes: string[]
  schemaId?: string
  supportRevocation?: boolean
}

export interface CredentialIssuanceRequest {
  type: 'jsonld' | 'anoncreds'
  jsonSchemaCredential: string
  claims: JsonObject
  did?: string
}

export interface CredentialIssuanceResponse {
  status: number
  didcommInvitationUrl: string
  credential: Record<string, unknown>
}

export interface ImportCredentialTypeOptions {
  id: string
  data: {
    name: string
    version: string
    credentialDefinition: JsonObject
    credentialDefinitionPrivate: JsonObject
    keyCorrectnessProof: JsonObject
    schema?: JsonObject
  }
}

export interface CredentialTypeInfo extends CreateCredentialTypeOptions {
  id: string
}

export interface CredentialTypeResult extends Omit<CredentialTypeInfo, 'supportRevocation'> {
  revocationSupported: boolean
  relatedJsonSchemaCredential?: string
}

export interface RevocationRegistryInfo {
  credentialDefinitionId: string
  maximumCredentialNumber: number
}

export interface CreatePresentationRequestOptions {
  ref?: string
  callbackUrl?: string
  requestedCredentials: RequestedCredential[]
}

export type RequestedCredential = {
  credentialDefinitionId: string
  attributes?: string[]
}

export interface CreatePresentationRequestResult {
  proofExchangeId: string
  url: string
  shortUrl: string
}

export interface CreateInvitationResult {
  url: string
}

export interface PresentationData {
  requestedCredentials: RequestedCredential[]
  claims: Claim[]
  verified: boolean
  state: ProofState
  proofExchangeId: string
  threadId: string
  updatedAt: Date | undefined
}

export interface CreateCredentialOfferOptions {
  credentialDefinitionId: string
  claims: ClaimOptions[]
}

export interface CreateCredentialOfferResult {
  credentialExchangeId: string
  url: string
  shortUrl: string
}

type ReceiveOutOfBandInvitationProps = Omit<ReceiveOutOfBandInvitationConfig, 'routing'>

export interface ReceiveInvitationProps extends ReceiveOutOfBandInvitationProps {
  invitation: Omit<OutOfBandInvitationSchema, 'appendedAttachments'>
}

export interface ReceiveInvitationByUrlProps extends ReceiveOutOfBandInvitationProps {
  invitationUrl: string
}

export interface AcceptInvitationConfig {
  autoAcceptConnection?: boolean
  reuseConnection?: boolean
  label?: string
  alias?: string
  imageUrl?: string
  mediatorId?: string
}

export interface OutOfBandInvitationSchema {
  '@id'?: string
  '@type': string
  label: string
  goalCode?: string
  goal?: string
  accept?: string[]
  handshake_protocols?: HandshakeProtocol[]
  services: Array<OutOfBandDidCommService | string>
  imageUrl?: string
}

export interface ConnectionInvitationSchema {
  id?: string
  '@type': string
  label: string
  did?: string
  recipientKeys?: string[]
  serviceEndpoint?: string
  routingKeys?: string[]
  imageUrl?: string
}
