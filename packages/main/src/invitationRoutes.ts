import 'reflect-metadata'

import express from 'express'
import fs from 'fs'
import multer from 'multer'
import path from 'path'
import QRCode from 'qrcode'

import { PresentationStatus, sendPresentationCallbackEvent } from './events/CallbackEvent'
import { VsAgent } from './utils/VsAgent'
import { createInvitation } from './utils/agent'
import { TsLogger } from './utils/logger'

// Add invitation endpoints (TODO: remove as it should be part of an external API)
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
              logger: (await agent.config.logger) as TsLogger,
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
    if (process.env.REDIRECT_DEFAULT_URL_TO_INVITATION_URL === 'true') res.redirect(invitationUrl)
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

  // TODO: This local disk-based image upload solution is temporary.
  // Serves static files from the "public" folder under the "/i" route
  app.use('/i', express.static(path.join(__dirname, 'public'), {
    fallthrough: false,
    dotfiles: 'deny',
    extensions: ['png', 'jpg', 'jpeg', 'gif'],
    maxAge: '1d', // Cache
  }))

  // Multer storage configuration to save uploaded images to the local "public" directory
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const dir = path.join(__dirname, 'public')
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    },
  })
  // Initialize Multer with the defined storage settings
  const upload = multer({ storage })
  // Respond with the uploaded image information
  app.post('/i', upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('No image uploaded')
    }
    res.status(201).send({
      message: 'Image uploaded successfully',
      fileName: req.file.filename,
      url: `/i/${req.file.filename}`,
    })
  })
}
