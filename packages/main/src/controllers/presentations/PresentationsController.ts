import { PresentationData, RequestedCredential, Claim } from '@2060.io/service-agent-model'
import { ProofExchangeRecord } from '@credo-ts/core'
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { AgentService } from '../../services/AgentService'

@ApiTags('presentations')
@Controller({
  path: 'presentations',
  version: '1',
})
export class PresentationsController {
  private readonly logger = new Logger(PresentationsController.name)

  constructor(private readonly agentService: AgentService) {}

  /**
   * Get all created credential types
   *
   * @returns
   */
  @Get('/')
  public async getAllPresentations(): Promise<PresentationData[]> {
    const agent = await this.agentService.getAgent()

    const records = await agent.proofs.getAll()

    return Promise.all(
      records.map(async record => {
        return await this.getPresentationData(record)
      }),
    )
  }

  /**
   * Delete a presentation exchange record
   *
   * @param proofExchangeId Proof Exchange Id
   */
  @Delete('/:proofExchangeId')
  public async deleteProofExchangeById(@Param('proofExchangeId') proofExchangeId: string) {
    const agent = await this.agentService.getAgent()
    await agent.proofs.deleteById(proofExchangeId, { deleteAssociatedDidCommMessages: true })
  }

  /**
   * Export a credential type, including its underlying cryptographic data for importing it in another instance
   *
   * @param credentialTypeId Credential Type Id
   * @returns ConnectionRecord
   */
  @Get('/:proofExchangeId')
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
      return await this.getPresentationData(record)
    } catch (error) {
      throw new InternalServerErrorException(error)
    }
  }

  private async getPresentationData(proofExchange: ProofExchangeRecord): Promise<PresentationData> {
    const agent = await this.agentService.getAgent()

    const formatData = await agent.proofs.getFormatData(proofExchange.id)

    const requestedCredentials = proofExchange.metadata.get(
      '_2060/requestedCredentials',
    ) as RequestedCredential[]

    const revealedAttributes =
      formatData.presentation?.anoncreds?.requested_proof.revealed_attrs ??
      formatData.presentation?.indy?.requested_proof.revealed_attrs

    const revealedAttributeGroups =
      formatData.presentation?.anoncreds?.requested_proof?.revealed_attr_groups ??
      formatData.presentation?.indy?.requested_proof.revealed_attr_groups

    const claims: Claim[] = []
    if (revealedAttributes) {
      for (const [name, value] of Object.entries(revealedAttributes)) {
        claims.push(new Claim({ name, value: value.raw }))
      }
    }

    if (revealedAttributeGroups) {
      for (const [, groupAttributes] of Object.entries(revealedAttributeGroups)) {
        for (const attrName in groupAttributes.values) {
          claims.push(new Claim({ name: attrName, value: groupAttributes.values[attrName].raw }))
        }
      }
    }
    return {
      requestedCredentials,
      claims,
      verified: proofExchange.isVerified ?? false,
      state: proofExchange.state,
      proofExchangeId: proofExchange.id,
      threadId: proofExchange.threadId,
      updatedAt: proofExchange.updatedAt,
    }
  }
}
