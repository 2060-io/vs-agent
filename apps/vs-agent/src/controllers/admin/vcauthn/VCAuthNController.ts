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
import {
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger'

import { AGENT_INVITATION_BASE_URL, AGENT_INVITATION_IMAGE_URL } from '../../../config/constants'
import { VsAgentService } from '../../../services/VsAgentService'

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
  @ApiOperation({
    summary: 'Create a new proof request',
    description: 'Generates and sends a new anoncreds V2 proof request',
  })
  @ApiBody({
    type: PresentProofCreateDto,
    examples: {
      default: {
        summary: 'Proof Request example',
        value: {
          proof_request: {
            name: 'Proof Request',
            version: '1.0',
            requested_attributes: {
              attr1_referent: { name: 'firstName', restrictions: [] },
              attr2_referent: { name: 'lastName', restrictions: [] },
            },
            requested_predicates: {},
          },
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Proof request created successfully',
    schema: {
      type: 'object',
      properties: {
        thread_id: { type: 'string', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
        presentation_exchange_id: { type: 'string', example: 'e2f1a5d4-3cb0-4f47-9c1a-12bdc1e736a4' },
        presentation_request: {
          type: 'object',
          example: {
            name: 'Proof Request',
            nonce: '1234567890',
            version: '1.0',
            requested_attributes: {
              attr1_referent: { name: 'firstName', restrictions: [] },
              attr2_referent: { name: 'lastName', restrictions: [] },
            },
            requested_predicates: {},
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid proof request payload' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error while creating proof request' })
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
  @ApiOperation({
    summary: 'Create an out-of-band invitation for a proof request',
    description: 'Embeds an existing proof request into an OOB invitation',
  })
  @ApiBody({
    type: OobInvitationDto,
    examples: {
      default: {
        summary: 'OOB Invitation request',
        value: {
          attachments: [{ id: 'e2f1a5d4-3cb0-4f47-9c1a-12bdc1e736a4', type: 'present-proof' }],
          use_public_did: true,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'OOB invitation created successfully',
    schema: {
      type: 'object',
      properties: {
        invitation: {
          type: 'object',
          example: {
            '@id': '12345678-90ab-cdef-1234-567890abcdef',
            '@type': 'https://didcomm.org/out-of-band/2.0/invitation',
            'requests~attach': [
              /* proof request attachment */
            ],
            label: 'My Agent',
            service: [
              /* DIDComm service entry */
            ],
          },
        },
        invi_msg_id: { type: 'string', example: '12345678-90ab-cdef-1234-567890abcdef' },
        invitation_url: {
          type: 'string',
          example: 'https://myhost.com/?oob=eyJAdHlwZSI6Imh0dHBzOi8v...',
        },
        oob_id: { type: 'string', example: '9f8e7d6c-5b4a-3f2d-1e0f-9d8c7b6a5c4e' },
        state: { type: 'string', example: 'active' },
        trace: { type: 'boolean', example: true },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid attachment payload' })
  @ApiNotFoundResponse({ description: 'Proof request message not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error while creating invitation' })
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
        imageUrl: AGENT_INVITATION_IMAGE_URL,
        messages: [requestMessage],
      })

      this.logger.debug(`Invitation: ${JSON.stringify(invitation.outOfBandInvitation.toJSON())}`)
      return {
        invitation: invitation.outOfBandInvitation.toJSON(),
        invi_msg_id: invitation.outOfBandInvitation.id,
        invitation_url: invitation.outOfBandInvitation.toUrl({
          domain: AGENT_INVITATION_BASE_URL,
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
  @ApiOperation({
    summary: 'Retrieve proof record by ID',
    description: 'Fetches both the presentation and the original request for a given proofExchangeId',
  })
  @ApiOkResponse({
    description: 'Proof record retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        presentation: {
          type: 'object',
          example: {
            proof: {
              /* anoncreds proof block */
            },
            presentation_proposal_dict: {
              /* ... */
            },
          },
        },
        presentation_request: {
          type: 'object',
          example: {
            name: 'Proof Request',
            nonce: '1234567890',
            version: '1.0',
            requested_attributes: {
              /* ... */
            },
            requested_predicates: {},
          },
        },
        verified: { type: 'boolean', example: true },
        state: { type: 'string', example: 'presentation_received' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'proofExchangeId parameter is required' })
  @ApiNotFoundResponse({ description: 'Proof exchange not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error while fetching proof record' })
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
  @ApiOperation({
    summary: 'Verify a presentation by proofExchangeId',
    description: 'Performs cryptographic verification of the specified presentation',
  })
  @ApiOkResponse({
    description: 'Presentation verified successfully',
    schema: {
      type: 'object',
      properties: {
        presentation: {
          type: 'object',
          example: {
            proof: {
              /* anoncreds proof block */
            },
            presentation_proposal_dict: {
              /* ... */
            },
          },
        },
        presentation_request: {
          type: 'object',
          example: {
            name: 'Proof Request',
            nonce: '1234567890',
            version: '1.0',
            requested_attributes: {
              /* ... */
            },
            requested_predicates: {},
          },
        },
        verified: { type: 'string', example: 'true' },
        state: { type: 'string', example: 'done' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'proofExchangeId parameter is required' })
  @ApiNotFoundResponse({ description: 'Proof exchange not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error while verifying presentation' })
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
