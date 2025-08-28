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
  convertPublicKeyToX25519,
  CredentialsModule,
  CredoError,
  DidCommV1Service,
  DidDocument,
  DidDocumentBuilder,
  DidDocumentService,
  DidRepository,
  DidsModule,
  InitConfig,
  KeyType,
  ParsedDid,
  parseDid,
  ProofsModule,
  TypedArrayEncoder,
  V2CredentialProtocol,
  V2ProofProtocol,
} from '@credo-ts/core'
import { QuestionAnswerModule } from '@credo-ts/question-answer'
import { WebVhAnonCredsRegistry, WebvhDidResolver } from '@credo-ts/webvh'
import { anoncreds } from '@hyperledger/anoncreds-nodejs'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { DidWebAnonCredsRegistry } from 'credo-ts-didweb-anoncreds'

import { FullTailsFileService } from '../services/FullTailsFileService'

import { CachedWebDidResolver } from './CachedWebDidResolver'
import { WebDidRegistrar } from './WebDidRegistrar'
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
  public publicApiBaseUrl?: string

  public constructor(
    options: AgentOptions<VsAgentModules> & {
      did?: string
      autoDiscloseUserProfile?: boolean
      publicApiBaseUrl?: string
    },
  ) {
    super(options)
    this.did = options.did
    this.autoDiscloseUserProfile = options.autoDiscloseUserProfile
    this.publicApiBaseUrl = options.publicApiBaseUrl
  }

  public async initialize() {
    await super.initialize()

    // Make sure default User Profile corresponds to settings in environment variables
    const imageUrl = this.config.connectionImageUrl
    const displayPicture = imageUrl ? { links: [imageUrl], mimeType: 'image/png' } : undefined

    await this.modules.userProfile.updateUserProfileData({
      displayName: this.config.label,
      displayPicture,
    })

    const parsedDid = this.did ? parseDid(this.did) : null
    if (parsedDid) {
      // If a public did is specified, check if it's already stored in the wallet. If it's not the case,
      // create a new one and generate keys for DIDComm (if there are endpoints configured)
      // TODO: Make DIDComm version, keys, etc. configurable. Keys can also be imported
      const domain = parsedDid.id.includes(':') ? parsedDid.id.split(':')[1] : parsedDid.id

      const existingRecord = await this.findCreatedDid(parsedDid)

      // DID has not been created yet. Let's do it
      if (!existingRecord) {
        if (parsedDid.method === 'web') {
          await this.dids.create({
            method: 'web',
            domain,
            didDocument: await this.buildDidDocument(parsedDid.did),
          })
          this.did = parsedDid.did
        } else if (parsedDid.method === 'webvh') {
          const {
            didState: { did: publicDid, didDocument: createdDoc },
          } = await this.dids.create({ method: 'webvh', domain })
          if (!publicDid || !createdDoc) {
            this.logger.error('Failed to create did:webvh record')
            process.exit(1)
          }

          // Add DIDComm services and keys
          const {
            verificationMethods,
            authentication,
            assertionMethod,
            keyAgreement,
            services: didcommServices,
            context,
          } = await this.createDidCommKeysAndServices(publicDid)
          createdDoc.context = [...(createdDoc.context ?? []), ...context]
          createdDoc.verificationMethod = [...(createdDoc.verificationMethod ?? []), ...verificationMethods]
          createdDoc.authentication = [...(createdDoc.authentication ?? []), authentication]
          createdDoc.assertionMethod = [...(createdDoc.assertionMethod ?? []), assertionMethod]
          createdDoc.keyAgreement = [...(createdDoc.keyAgreement ?? []), keyAgreement]
          createdDoc.service = [...(createdDoc.service ?? []), ...didcommServices]

          // Add Self-TR services
          createdDoc.service = [
            ...(createdDoc.service ?? []),
            ...[
              new DidDocumentService({
                id: `${publicDid}#vpr-ecs-trust-registry-1234`,
                serviceEndpoint: `${this.publicApiBaseUrl}/self-tr`,
                type: 'VerifiablePublicRegistry',
              }),
              new DidDocumentService({
                id: `${publicDid}#vpr-ecs-service-c-vp`,
                serviceEndpoint: `${this.publicApiBaseUrl}/self-tr/ecs-service-c-vp.json`,
                type: 'LinkedVerifiablePresentation',
              }),
              new DidDocumentService({
                id: `${publicDid}#vpr-ecs-org-c-vp`,
                serviceEndpoint: `${this.publicApiBaseUrl}/self-tr/ecs-org-c-vp.json`,
                type: 'LinkedVerifiablePresentation',
              }),
            ],
          ]
          console.log(`createdDoc: ${JSON.stringify(createdDoc)}`)

          // TODO: Add AnonCreds services once it is supported
          const result = await this.dids.update({ did: publicDid, didDocument: createdDoc })
          if (result.didState.state !== 'finished') {
            this.logger.error(`Cannot update DID ${publicDid}`)
            process.exit(1)
          }
          this.logger?.debug('Public did:webvh record created')
          this.did = publicDid
        } else {
          throw new CredoError(`Agent DID method not supported: ${parsedDid.method}`)
        }

        return
      }

      // DID Already exists: update it in case that agent parameters have been changed. At the moment, we can only update
      //  DIDComm endpoints, so we'll only replace the service (if different from previous)
      const didDocument = existingRecord.didDocument!

      if (
        JSON.stringify(didDocument.didCommServices) !==
        JSON.stringify(
          new DidDocument({ id: existingRecord.id, service: this.getDidCommServices(existingRecord.id) }),
        )
      ) {
        // Replace all DIDComm services by the new ones
        didDocument.service = [
          ...(didDocument.service
            ? didDocument.service.filter(service => ![DidCommV1Service.type].includes(service.type))
            : []),
          ...this.getDidCommServices(existingRecord.id),
        ]
        await this.dids.update({ did: parsedDid.did, didDocument })
        this.logger?.debug('Public did record updated')
      } else {
        this.logger?.debug('Existing DID record found. No updates')
      }
      this.did = existingRecord.did
    }
  }

  private async buildDidDocument(publicDid: string) {
    const {
      verificationMethods,
      authentication,
      assertionMethod,
      keyAgreement,
      services: didcommServices,
      context,
    } = await this.createDidCommKeysAndServices(publicDid)

    const builder = new DidDocumentBuilder(publicDid)

    builder
      .addContext(context[0])
      .addContext(context[1])
      .addVerificationMethod(verificationMethods[0])
      .addVerificationMethod(verificationMethods[1])
      .addAuthentication(authentication)
      .addAssertionMethod(assertionMethod)
      .addKeyAgreement(keyAgreement)

    didcommServices.forEach(service => builder.addService(service))

    // Create a set of keys suitable for did self issued
    builder
      .addService(
        new DidDocumentService({
          id: `${publicDid}#vpr-ecs-trust-registry-1234`,
          serviceEndpoint: `${this.publicApiBaseUrl}/self-tr`,
          type: 'VerifiablePublicRegistry',
        }),
      )
      .addService(
        new DidDocumentService({
          id: `${publicDid}#vpr-ecs-service-c-vp`,
          serviceEndpoint: `${this.publicApiBaseUrl}/self-tr/ecs-service-c-vp.json`,
          type: 'LinkedVerifiablePresentation',
        }),
      )
      .addService(
        new DidDocumentService({
          id: `${publicDid}#vpr-ecs-org-c-vp`,
          serviceEndpoint: `${this.publicApiBaseUrl}/self-tr/ecs-org-c-vp.json`,
          type: 'LinkedVerifiablePresentation',
        }),
      )

    if (this.publicApiBaseUrl) {
      builder.addService(
        new DidDocumentService({
          id: `${publicDid}#anoncreds`,
          serviceEndpoint: `${this.publicApiBaseUrl}/anoncreds/v1`,
          type: 'AnonCredsRegistry',
        }),
      )
    }

    return builder.build()
  }

  private async findCreatedDid(parsedDid: ParsedDid) {
    const didRepository = this.dependencyManager.resolve(DidRepository)

    // Particular case of webvh: parsedDid might not include the SCID, so we'll need to find it by domain
    if (parsedDid.method === 'webvh') {
      const domain = parsedDid.id.includes(':') ? parsedDid.id.split(':')[1] : parsedDid.id
      return await didRepository.findSingleByQuery(this.context, { method: 'webvh', domain })
    }

    return await didRepository.findCreatedDid(this.context, parsedDid.did)
  }

  private getDidCommServices(publicDid: string) {
    const keyAgreementId = `${publicDid}#key-agreement-1`

    return this.config.endpoints.map((endpoint, index) => {
      return new DidCommV1Service({
        id: `${publicDid}#did-communication`,
        serviceEndpoint: endpoint,
        priority: index,
        routingKeys: [], // TODO: Support mediation
        recipientKeys: [keyAgreementId],
        accept: ['didcomm/aip2;env=rfc19'],
      })
    })
  }

  private async createDidCommKeysAndServices(publicDid: string) {
    const context = [
      'https://w3id.org/security/suites/ed25519-2018/v1',
      'https://w3id.org/security/suites/x25519-2019/v1',
    ]
    const keyAgreementId = `${publicDid}#key-agreement-1`
    const ed25519 = await this.wallet.createKey({ keyType: KeyType.Ed25519 })
    const verificationMethodId = `${publicDid}#${ed25519.fingerprint}`
    const publicKeyX25519 = TypedArrayEncoder.toBase58(
      convertPublicKeyToX25519(TypedArrayEncoder.fromBase58(ed25519.publicKeyBase58)),
    )

    const verificationMethods = [
      {
        controller: publicDid,
        id: verificationMethodId,
        publicKeyBase58: ed25519.publicKeyBase58,
        type: 'Ed25519VerificationKey2018',
      },
      {
        controller: publicDid,
        id: keyAgreementId,
        publicKeyBase58: publicKeyX25519,
        type: 'X25519KeyAgreementKey2019',
      },
    ]

    const authentication = verificationMethodId
    const assertionMethod = verificationMethodId
    const keyAgreement = keyAgreementId

    const services = this.getDidCommServices(publicDid)

    return { context, verificationMethods, authentication, assertionMethod, keyAgreement, services }
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
        registries: [
          new DidWebAnonCredsRegistry({
            cacheOptions: { allowCaching: true, cacheDurationInSeconds: 24 * 60 * 60 },
          }),
          new WebVhAnonCredsRegistry(),
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
      dids: new DidsModule({
        resolvers: [new CachedWebDidResolver(), new WebvhDidResolver()],
        registrars: [new WebDidRegistrar(), new WebVhDidRegistrar()],
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
    publicApiBaseUrl: options.publicApiBaseUrl,
  })
}
