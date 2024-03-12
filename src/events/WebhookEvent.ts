import fetch from 'node-fetch'
import { TsLogger } from '../utils/logger'

export const sendWebhookEvent = async (webhookUrl: string, body: Record<string, unknown>, logger: TsLogger) => {
  try {
    logger.debug(`sending webhook event to ${webhookUrl}: ${JSON.stringify(body)}`)
    const response = await fetch(webhookUrl, {
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
