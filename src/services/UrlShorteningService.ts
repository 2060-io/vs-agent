import { Inject, Injectable } from '@nestjs/common'

import { ServiceAgent } from '../utils/ServiceAgent'

@Injectable()
export class UrlShorteningService {
  constructor(@Inject('AGENT') private agent: ServiceAgent) {}

  async createShortUrl(options: { longUrl: string; relatedFlowId?: string }) {
    const { longUrl, relatedFlowId } = options

    const record = await this.agent.genericRecords.save({
      content: { longUrl },
      tags: { type: 'short-url', relatedFlowId },
    })
    return record.id
  }

  async getLongUrl(id: string) {
    const record = await this.agent.genericRecords.findById(id)

    return record ? (record.content.longUrl as string) : undefined
  }

  // TODO: Delete short url records once flows are accomplished
  async deleteShortUrlById(id: string) {
    await this.agent.genericRecords.deleteById(id)
  }

  async deleteShortUrlByRelatedFlowId(relatedFlowId: string) {
    const records = await this.agent.genericRecords.findAllByQuery({ relatedFlowId })
    records.forEach(this.agent.genericRecords.delete)
  }
}
