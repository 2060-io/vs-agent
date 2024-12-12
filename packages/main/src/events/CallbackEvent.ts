import { Claim } from '@2060.io/service-agent-model'
import fetch from 'node-fetch'

import { TsLogger } from '../utils/logger'

export enum PresentationStatus {
  OK = 'ok',
  REFUSED = 'refused',
  NO_COMPATIBLE_CREDENTIALS = 'no-compatible-credentials',
  VERIFICATION_ERROR = 'verification-error',
  UNSPECIFIED_ERROR = 'unspecified-error',
}

export const sendPresentationCallbackEvent = async (options: {
  callbackUrl: string
  status: PresentationStatus
  ref?: string
  claims?: Claim[]
  logger: TsLogger
}) => {
  const { callbackUrl, ref, claims, logger } = options
  try {
    logger.debug(`sending presentation callback event to ${callbackUrl}: ${JSON.stringify(options)}`)
    await fetch(callbackUrl, {
      method: 'POST',
      body: JSON.stringify({
        ref,
        claims,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error(`Error sending presentation callback event to ${callbackUrl}`, {
      cause: error,
    })
  }
}
