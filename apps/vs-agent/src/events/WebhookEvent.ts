import { Event } from '@verana-labs/vs-agent-model'
import fetch from 'node-fetch'

import { TsLogger } from '../utils'

export const sendWebhookEvent = async (webhookUrl: string, body: Event, logger: TsLogger) => {
  try {
    logger.debug(`sending webhook event to ${webhookUrl}: ${JSON.stringify(body)}`)
    await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error(`Error sending ${body.type} webhook event to ${webhookUrl}`, {
      cause: error,
    })
  }
}
