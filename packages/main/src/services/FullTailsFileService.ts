import type { AnonCredsRevocationRegistryDefinition } from '@credo-ts/anoncreds'
import type { AgentContext } from '@credo-ts/core'

import { BasicTailsFileService } from '@credo-ts/anoncreds'
import { utils } from '@credo-ts/core'
import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'

export class FullTailsFileService extends BasicTailsFileService {
  private tailsServerBaseUrl?: string
  public constructor(options?: { tailsDirectoryPath?: string; tailsServerBaseUrl?: string }) {
    super(options)
    this.tailsServerBaseUrl = options?.tailsServerBaseUrl
  }

  public async uploadTailsFile(
    agentContext: AgentContext,
    options: {
      revocationRegistryDefinition: AnonCredsRevocationRegistryDefinition
    },
  ) {
    const revocationRegistryDefinition = options.revocationRegistryDefinition
    const localTailsFilePath = revocationRegistryDefinition.value.tailsLocation

    const tailsFileId = utils.uuid()
    const data = new FormData()
    const readStream = fs.createReadStream(localTailsFilePath)
    data.append('file', readStream)
    const response = await axios.put(`${this.tailsServerBaseUrl}/${encodeURIComponent(tailsFileId)}`, data, {
      headers: {
        ...data.getHeaders(),
      },
    })
    if (response.status !== 200) {
      throw new Error('Cannot upload tails file')
    }
    return { tailsFileUrl: `${this.tailsServerBaseUrl}/${encodeURIComponent(tailsFileId)}` }
  }
}
