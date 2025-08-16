import { DidCommCallsModule } from '@2060.io/credo-ts-didcomm-calls'
import { MediaSharingModule } from '@2060.io/credo-ts-didcomm-media-sharing'
import { DidCommMrtdModule } from '@2060.io/credo-ts-didcomm-mrtd'
import { ReceiptsModule } from '@2060.io/credo-ts-didcomm-receipts'
import { UserProfileModule, UserProfileModuleConfig } from '@2060.io/credo-ts-didcomm-user-profile'
import { ActionMenuModule } from '@credo-ts/action-menu'
import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
  AnonCredsProofFormatService,
  LegacyIndyCredentialFormatService,
  LegacyIndyProofFormatService,
} from '@credo-ts/anoncreds'
import { AskarModule } from '@credo-ts/askar'
import {
  Agent,
  AgentDependencies,
  AutoAcceptCredential,
  AutoAcceptProof,
  ConnectionsModule,
  CredentialsModule,
  DidsModule,
  InitConfig,
  ProofsModule,
  V2CredentialProtocol,
  V2ProofProtocol,
} from '@credo-ts/core'
import { QuestionAnswerModule } from '@credo-ts/question-answer'
import { WebVhAnonCredsRegistry } from '@credo-ts/webvh'
import { anoncreds } from '@hyperledger/anoncreds-nodejs'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'

import { FullTailsFileService } from '../services/FullTailsFileService'

import { CachedWebDidResolver } from './CachedWebDidResolver'
import { WebVhDidRegistrar } from './WebVhDidRegistrar'

type VsAgentModules = {
  askar: AskarModule
  anoncreds: AnonCredsModule
  actionMenu: ActionMenuModule
  dids: DidsModule
  connections: ConnectionsModule
  calls: DidCommCallsModule
  credentials: CredentialsModule<
    [V2CredentialProtocol<[LegacyIndyCredentialFormatService, AnonCredsCredentialFormatService]>]
  >
  proofs: ProofsModule<[V2ProofProtocol<[LegacyIndyProofFormatService, AnonCredsProofFormatService]>]>
  media: MediaSharingModule
  mrtd: DidCommMrtdModule
  questionAnswer: QuestionAnswerModule
  receipts: ReceiptsModule
  userProfile: UserProfileModule
}

interface AgentOptions<VsAgentModules> {
  config: InitConfig
  modules?: VsAgentModules
  dependencies: AgentDependencies
}

export class VsAgent extends Agent<VsAgentModules> {
  public did?: string
  public autoDiscloseUserProfile?: boolean

  public constructor(
    options: AgentOptions<VsAgentModules> & { did?: string; autoDiscloseUserProfile?: boolean },
  ) {
    super(options)
    this.did = options.did
    this.autoDiscloseUserProfile = options.autoDiscloseUserProfile
  }
}

export interface VsAgentOptions {
  config: InitConfig
  did?: string
  autoDiscloseUserProfile?: boolean
  dependencies: AgentDependencies
  publicApiBaseUrl: string
  masterListCscaLocation?: string
}

export const createVsAgent = (options: VsAgentOptions): VsAgent => {
  return new VsAgent({
    config: options.config,
    dependencies: options.dependencies,
    modules: {
      askar: new AskarModule({ ariesAskar }),
      anoncreds: new AnonCredsModule({
        anoncreds,
        tailsFileService: new FullTailsFileService({
          tailsServerBaseUrl: `${options.publicApiBaseUrl}/anoncreds/v1/tails`,
        }),
        registries: [new WebVhAnonCredsRegistry()],
      }),
      actionMenu: new ActionMenuModule(),
      calls: new DidCommCallsModule(),
      connections: new ConnectionsModule({ autoAcceptConnections: true }),
      credentials: new CredentialsModule({
        autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
        credentialProtocols: [
          new V2CredentialProtocol({
            credentialFormats: [
              new LegacyIndyCredentialFormatService(),
              new AnonCredsCredentialFormatService(),
            ],
          }),
        ],
      }),
      dids: new DidsModule({
        resolvers: [new CachedWebDidResolver()],
        registrars: [new WebVhDidRegistrar()],
      }),
      mrtd: new DidCommMrtdModule({ masterListCscaLocation: options.masterListCscaLocation }),
      proofs: new ProofsModule({
        autoAcceptProofs: AutoAcceptProof.ContentApproved,
        proofProtocols: [
          new V2ProofProtocol({
            proofFormats: [new LegacyIndyProofFormatService(), new AnonCredsProofFormatService()],
          }),
        ],
      }),
      media: new MediaSharingModule(),
      questionAnswer: new QuestionAnswerModule(),
      receipts: new ReceiptsModule(),
      // Disable module's auto disclose feature, since we are going to manage it in MessageEvents
      userProfile: new UserProfileModule(new UserProfileModuleConfig({ autoSendProfile: false })),
    },
    did: options.did,
    autoDiscloseUserProfile: options.autoDiscloseUserProfile,
  })
}
