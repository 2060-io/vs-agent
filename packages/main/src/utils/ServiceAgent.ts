import { DidCommCallsModule } from '@2060.io/credo-ts-didcomm-calls'
import { DidCommMrtdModule } from '@2060.io/credo-ts-didcomm-mrtd'
import { UserProfileModule } from '@2060.io/credo-ts-didcomm-user-profile'
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
  DiscoverFeaturesModule,
  InitConfig,
  ProofsModule,
  V2CredentialProtocol,
  V2ProofProtocol,
} from '@credo-ts/core'
import { QuestionAnswerModule } from '@credo-ts/question-answer'
import { anoncreds } from '@hyperledger/anoncreds-nodejs'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { DidWebAnonCredsRegistry } from 'credo-ts-didweb-anoncreds'
import { MediaSharingModule } from 'credo-ts-media-sharing'
import { ReceiptsModule } from 'credo-ts-receipts'

import { FullTailsFileService } from '../services/FullTailsFileService'

import { CachedWebDidResolver } from './CachedWebDidResolver'

type ServiceAgentModules = {
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

interface AgentOptions<ServiceAgentModules> {
  config: InitConfig
  modules?: ServiceAgentModules
  dependencies: AgentDependencies
}

export class ServiceAgent extends Agent<ServiceAgentModules> {
  public did?: string

  public constructor(options: AgentOptions<ServiceAgentModules>, did?: string) {
    super(options)
    this.did = did
  }
}

export interface ServiceAgentOptions {
  config: InitConfig
  did?: string
  dependencies: AgentDependencies
  anoncredsServiceBaseUrl?: string
}

export const createServiceAgent = (options: ServiceAgentOptions): ServiceAgent => {
  return new ServiceAgent(
    {
      config: options.config,
      dependencies: options.dependencies,
      modules: {
        askar: new AskarModule({ ariesAskar }),
        anoncreds: new AnonCredsModule({
          anoncreds,
          tailsFileService: new FullTailsFileService({
            tailsServerBaseUrl: `${options.anoncredsServiceBaseUrl}/anoncreds/v1/tails`,
          }),
          registries: [
            new DidWebAnonCredsRegistry({
              cacheOptions: { allowCaching: true, cacheDurationInSeconds: 24 * 60 * 60 },
            }),
          ],
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
        dids: new DidsModule({ resolvers: [new CachedWebDidResolver()] }),
        mrtd: new DidCommMrtdModule(),
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
        userProfile: new UserProfileModule(),
      },
    },
    options.did,
  )
}
