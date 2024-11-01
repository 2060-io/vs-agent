import { DidExchangeState, RecordNotFoundError } from '@credo-ts/core'
import {
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common'
import { ApiQuery, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'

import { AgentService } from '../../services/AgentService'

@ApiTags('connections')
@Controller({
  path: 'connections',
  version: '1',
})
export class ConnectionController {
  constructor(private readonly agentService: AgentService) {}

  /**
   * Retrieve all connections records
   * @param alias Alias
   * @param state Connection state
   * @param myDid My DID
   * @param theirDid Their DID
   * @param theirLabel Their label
   * @returns ConnectionRecord[]
   */
  @Get('/')
  @ApiQuery({ name: 'outOfBandId', required: false, type: String })
  @ApiQuery({ name: 'state', required: false, type: String })
  @ApiQuery({ name: 'did', required: false, type: String })
  @ApiQuery({ name: 'theirDid', required: false, type: String })
  @ApiQuery({ name: 'threadId', required: false, type: String })
  public async getAllConnections(
    @Query('outOfBandId') outOfBandId?: string,
    @Query('state') state?: DidExchangeState,
    @Query('did') did?: string,
    @Query('theirDid') theirDid?: string,
    @Query('threadId') threadId?: string,
  ) {
    const agent = await this.agentService.getAgent()

    const connections = await agent.connections.findAllByQuery({
      did,
      theirDid,
      threadId,
      state,
      outOfBandId,
    })

    return connections.map(record => ({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      did: record.did,
      theirDid: record.theirDid,
      theirLabel: record.theirLabel,
      state: record.state,
      role: record.role,
      alias: record.alias,
      threadId: record.threadId,
      imageUrl: record.imageUrl,
      outOfBandId: record.outOfBandId,
      invitationDid: record.invitationDid,
    }))
  }

  /**
   * Retrieve connection record by connection id
   * @param connectionId Connection identifier
   * @returns ConnectionRecord
   */
  @Get(':connectionId')
  public async getConnectionById(@Param('connectionId') connectionId: string) {
    const agent = await this.agentService.getAgent()

    const connection = await agent.connections.findById(connectionId)

    if (!connection)
      throw new NotFoundException({ reason: `connection with connection id "${connectionId}" not found.` })

    return connection.toJSON()
  }

  /**
   * Deletes a connection record from the connection repository.
   *
   * @param connectionId Connection identifier
   */
  @Delete('/:connectionId')
  public async deleteConnection(@Param('connectionId') connectionId: string, @Res() response: Response) {
    const agent = await this.agentService.getAgent()

    try {
      await agent.connections.deleteById(connectionId)
      response.status(204)
    } catch (error) {
      if (error instanceof RecordNotFoundError) {
        throw new NotFoundException({ reason: `connection with connection id "${connectionId}" not found.` })
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `something went wrong: ${error}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      )
    }
  }
}
