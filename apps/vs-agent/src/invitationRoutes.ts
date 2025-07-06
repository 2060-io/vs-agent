import 'reflect-metadata'

import express from 'express'
import QRCode from 'qrcode'

import { REDIRECT_DEFAULT_URL_TO_INVITATION_URL } from './config/constants'
import { PresentationStatus, sendPresentationCallbackEvent } from './events/CallbackEvent'
import { VsAgent } from './utils/VsAgent'
import { createInvitation } from './utils/agent'
import { TsLogger } from './utils/logger'

// Add invitation endpoints
export const addInvitationRoutes = async (app: express.Express, agent: VsAgent) => {
  // Retrieve the URL that corresponds to a given short URL
  app.get('/s', async (req, res) => {
    try {
      const id = req.query.id as string

      if (!id) {
        res.status(404).end()
        return
      }

      const shortUrlRecord = await agent.genericRecords.findById(id)
      const longUrl = shortUrlRecord?.content.longUrl as string
      if (!id) {
        res.status(404).end()
        return
      }

      if (req.accepts('json')) {
        const connRecord = shortUrlRecord?.getTag('relatedFlowId') as string

        // If a related proof record ID exists, fetch the proof and trigger the callback event if exist.
        if (connRecord) {
          const proofRecord = await agent.proofs.getById(connRecord)
          const callbackParameters = proofRecord.metadata.get('_2060/callbackParameters') as
            | { ref?: string; callbackUrl?: string }
            | undefined
          if (callbackParameters && callbackParameters.callbackUrl) {
            await sendPresentationCallbackEvent({
              proofExchangeId: proofRecord.id,
              callbackUrl: callbackParameters.callbackUrl,
              status: PresentationStatus.SCANNED,
              logger: agent.config.logger as TsLogger,
              ref: callbackParameters.ref,
            })
          }
        }
        const invitation = await agent.oob.parseInvitation(longUrl)
        res.send(invitation.toJSON()).end()
      } else {
        res.status(302).location(longUrl).end()
      }
    } catch (error) {
      res.status(500).end()
    }
  })

  // Generate a regular invitation
  app.get('/invitation', async (req, res) => {
    const { url: invitationUrl } = await createInvitation(agent)
    if (REDIRECT_DEFAULT_URL_TO_INVITATION_URL) res.redirect(invitationUrl)
    else res.send(invitationUrl)
  })

  // Generate a regular invitation and render it to a QR code
  app.get('/qr', async (req, res) => {
    const { fcolor, bcolor, size, padding, level } = req.query as {
      fcolor?: string
      bcolor?: string
      size?: number
      padding?: number
      level?: string
    }

    const { url: invitationUrl } = await createInvitation(agent)

    function isQRCodeErrorCorrectionLevel(input?: string): input is QRCode.QRCodeErrorCorrectionLevel {
      return input ? ['low', 'medium', 'quartile', 'high', 'L', 'M', 'Q', 'H'].includes(input) : false
    }
    const errorCorrectionLevel: QRCode.QRCodeErrorCorrectionLevel = isQRCodeErrorCorrectionLevel(level)
      ? level
      : 'L'

    try {
      const qr = await QRCode.toBuffer(invitationUrl, {
        color: {
          dark: fcolor ? `#${fcolor}` : undefined,
          light: bcolor ? `#${bcolor}` : undefined,
        },
        errorCorrectionLevel,
        width: size,
        margin: padding,
      })
      res.header('Content-Type', 'image/png; charset=utf-8')
      res.send(qr)
    } catch (error) {
      res.status(500)
      res.json({ error: error.message }).end()
    }
  })
}
