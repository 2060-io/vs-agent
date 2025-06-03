import { HandshakeProtocol } from '@credo-ts/core'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common'
import { ApiBody, ApiTags } from '@nestjs/swagger'

import { VsAgentService } from '../../services/VsAgentService'

import { OobInvitationDto, OutOfBandInvitationCreateResult } from './OobInvitationDto'
import { PresentProofCreateDto, PresentProofCreateResult } from './PresentProofCreateDto'

@ApiTags('vcauthn')
@Controller({
  path: 'vc-authn',
  version: '1',
})
export class VCAuthNController {
  private readonly logger = new Logger(VCAuthNController.name)

  constructor(private readonly agentService: VsAgentService) {}

  @Post('/present-proof/create-request')
  @HttpCode(200)
  @ApiBody({
    type: PresentProofCreateDto,
  })
  public async createProofRequest(@Body() options: PresentProofCreateDto): Promise<PresentProofCreateResult> {
    const agent = await this.agentService.getAgent()

    const { proof_request: proofRequest } = options

    // TODO: Verify proofRequest
    this.logger.debug(`proofRequest: ${JSON.stringify(options)}`)

    const request = await agent.proofs.createRequest({
      proofFormats: { anoncreds: proofRequest },
      protocolVersion: 'v2',
    })
    this.logger.debug(`created request: ${JSON.stringify(request)}`)
    return {
      thread_id: request.proofRecord.threadId,
      presentation_exchange_id: request.proofRecord.id,
      presentation_request: request.message.toJSON(),
    }
  }

  @Post('/out-of-band/create-invitation')
  @HttpCode(200)
  @ApiBody({
    type: OobInvitationDto,
  })
  public async createOobInvitation(
    @Body() options: OobInvitationDto,
  ): Promise<OutOfBandInvitationCreateResult> {
    const agent = await this.agentService.getAgent()

    const { attachments, use_public_did: usePublicDid } = options

    if (attachments?.length !== 1) {
      throw Error('You must specify a single attachment')
    }

    const { id, type } = attachments[0]

    if (type === 'present-proof') {
      const requestMessage = await agent.proofs.findRequestMessage(id)
      if (!requestMessage) throw new Error('Cannot find proof request message')

      const invitation = await agent.oob.createInvitation({
        label: agent.config.label,
        handshakeProtocols: [HandshakeProtocol.DidExchange, HandshakeProtocol.Connections],
        invitationDid: usePublicDid && agent.did ? agent.did : undefined,
        multiUseInvitation: false,
        imageUrl: process.env.AGENT_INVITATION_IMAGE_URL,
        messages: [requestMessage],
      })

      this.logger.debug(`Invitation: ${JSON.stringify(invitation.outOfBandInvitation.toJSON())}`)
      return {
        invitation: invitation.outOfBandInvitation.toJSON(),
        invi_msg_id: invitation.outOfBandInvitation.id,
        invitation_url: invitation.outOfBandInvitation.toUrl({
          domain: process.env.AGENT_INVITATION_BASE_URL ?? 'https://hologram.zone/',
        }),
        oob_id: invitation.id,
        state: invitation.state,
        trace: true,
      }
    } else {
      throw Error(`Unsupported attachment type: ${type}`)
    }
  }

  /**
   * Get Presentation Data By Id. From ACA-Py API, we only return what is actually used by VC-AuthN
   *
   * @param proofExchangeId
   * @returns { presentation and request }
   */
  @Get('/present-proof/records/:proofExchangeId')
  public async getPresentationById(@Param('proofExchangeId') proofExchangeId: string) {
    const agent = await this.agentService.getAgent()

    if (!proofExchangeId) {
      throw new BadRequestException({ reason: 'proofExchangeId is required' })
    }

    const record = await agent.proofs.findById(proofExchangeId)

    if (!record) {
      throw new NotFoundException({ reason: `proof exchange with id "${proofExchangeId}" not found.` })
    }

    try {
      const data = await agent.proofs.getFormatData(proofExchangeId)

      return {
        presentation: data.presentation?.anoncreds ?? data.presentation?.indy,
        presentation_request: data.request?.anoncreds ?? data.request?.indy,
        verified: record.isVerified,
        state: record.state,
      }
    } catch (error) {
      throw new InternalServerErrorException(error)
    }
  }

  @Post('/present-proof/records/:proofExchangeId/verify-presentation')
  @HttpCode(200)
  public async verifyPresentationById(@Param('proofExchangeId') proofExchangeId: string) {
    const agent = await this.agentService.getAgent()

    if (!proofExchangeId) {
      throw new BadRequestException({ reason: 'proofExchangeId is required' })
    }

    const record = await agent.proofs.findById(proofExchangeId)

    if (!record) {
      throw new NotFoundException({ reason: `proof exchange with id "${proofExchangeId}" not found.` })
    }

    try {
      const data = await agent.proofs.getFormatData(proofExchangeId)

      return {
        presentation: data.presentation?.anoncreds ?? data.presentation?.indy,
        presentation_request: data.request?.anoncreds ?? data.request?.indy,
        verified: record.isVerified ? 'true' : 'false',
        state: record.state,
      }
    } catch (error) {
      throw new InternalServerErrorException(error)
    }
  }
}
