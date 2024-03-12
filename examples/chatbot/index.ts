import express from 'express'
import cors from 'cors'
import path from 'path'
import fetch from 'node-fetch'
import { helpMessage, rockyQuotes, rootContextMenu, rootMenuAsQA, welcomeMessage, worldCupPoll } from './data'

const PORT = Number(process.env.PORT || 5002)
const SERVICE_AGENT_BASE_URL = process.env.SERVICE_AGENT_ADMIN_BASE_URL || 'http://localhost:5000'
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:5002'

const app = express()

const staticDir = path.join(__dirname, 'public')
app.use(express.static(staticDir))

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.set('json spaces', 2)

const phoneNumberCredentialDefinitionId = process.env.PHONE_CREDENTIAL_DEFINITION_ID || 'did:web:pn-vs.dev.2060.io?service=anoncreds&relativeRef=/credDef/26BYVUEasEVQDkVwttUTQm33vf9JQ35CPnySRem1VwtB'

const server = app.listen(PORT, async () => {
  console.log(`Dummy chatbot started on port ${PORT}`)

  console.log(`phoneNumberCredentialDefinitionId: ${phoneNumberCredentialDefinitionId}`)
})

export const submitMessage = async (body: unknown) => {
  console.log(`submitMessage: ${JSON.stringify(body)}`)
  await fetch(`${SERVICE_AGENT_BASE_URL}/message`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const submitMessageReceipt = async (receivedMessage: any, messageState: 'received' | 'viewed') => {
  const body = {
    type: 'receipts',
    connectionId: receivedMessage.connectionId,
    receipts: [
      {
        messageId: receivedMessage.id,
        state: messageState,
        timestamp: new Date().toISOString(),
      },
    ],
  }
  await submitMessage(body)
}

const sendRootMenu = async (connectionId: string) => {
  const body = {
    type: 'contextual-menu-update',
    connectionId,
    ...rootContextMenu,
  }
  await submitMessage(body)
}

const sendTextMessage = async (options: { connectionId: string; content: string }) => {
  const body = {
    type: 'text',
    connectionId: options.connectionId,
    content: options.content,
  }

  await submitMessage(body)
}

const sendQuestion = async (options: {
  connectionId: string
  question: { prompt: string; menuItems: { id: string; text: string }[] }
}) => {
  const body = {
    type: 'menu-display',
    connectionId: options.connectionId,
    ...options.question,
  }
  await submitMessage(body)
}

const handleMenuSelection = async (options: { connectionId: string; item: string }) => {
  console.log(`handleMenuSelection: ${options.item}`)
  const selectedItem = options.item
  const connectionId = options.connectionId

  if (selectedItem === 'poll' || selectedItem === 'Sure!' || selectedItem === '⚽ World Cup poll') {
    await sendQuestion({ connectionId, question: worldCupPoll })
  }

  // Home
  if (selectedItem === 'home' || selectedItem === '🏡 Home') {
    await sendTextMessage({ connectionId, content: welcomeMessage })
  }

  // Chat
  if (selectedItem === 'chat' || selectedItem === '🗨️ New chat') {
    if (phoneNumberCredentialDefinitionId === '') {
      await sendTextMessage({
        connectionId,
        content: 'Service not available',
      })
    } else {
      await sendTextMessage({
        connectionId,
        content: 'In order to start a new chat, we need some verifiable information from you',
      })
      const body = {
        type: 'identity-proof-request',
        connectionId,
        requestedProofItems: [
          {
            id: '1',
            type: 'verifiable-credential',
            value: { credentialDefinitionId: phoneNumberCredentialDefinitionId, attributes: ['phoneNumber'] },
          },
        ],
      }
      await submitMessage(body)
    }
  }

  // Help
  if (selectedItem === 'help' || selectedItem === '🆘 Help') {
    await sendTextMessage({ connectionId, content: helpMessage })
  }

  // Rocky quotes
  if (selectedItem === 'rocky' || selectedItem === '💪 Rocky quotes' || selectedItem === 'Inspire me!') {
    // send random Rocky quote
    await sendTextMessage({ connectionId, content: rockyQuotes[Math.floor(Math.random() * rockyQuotes.length)] })
    await sendQuestion({
      connectionId,
      question: {
        prompt: 'Another inspiring Rocky quote?',
        menuItems: [
          {
            id: 'rocky',
            text: 'Inspire me!',
          },
          {
            id: 'idle',
            text: 'No',
          },
        ],
      },
    })
    return
  }

  // World Cup poll responses
  const worldCupResponses = worldCupPoll.menuItems.map((item) => item.text)
  if (worldCupResponses.includes(selectedItem)) {
    if (selectedItem === '🇦🇷 Argentina') {
      // Yes!
      await sendTextMessage({ connectionId, content: 'Correct! Vamos Argentina!' })
    } else {
      // No way!
      await sendTextMessage({ connectionId, content: 'No way...' })
      await sendQuestion({
        connectionId,
        question: {
          prompt: 'Do you want to try again?',
          menuItems: [
            {
              id: 'poll',
              text: 'Sure!',
            },
            {
              id: 'idle',
              text: 'No',
            },
          ],
        },
      })
    }
    return
  }
}

app.post('/connection-state-updated', async (req, res) => {
  const obj = req.body
  console.log(`connection state updated: ${JSON.stringify(obj)}`)
  if (obj.state === 'completed') {
    await sendRootMenu(obj.connectionId)
    await sendTextMessage({
      connectionId: obj.connectionId,
      content: welcomeMessage,
    })
  }
  res.json({ message: 'ok' })
})

app.post('/message-state-updated', async (req, res) => {
  const obj = req.body
  console.log(`message state updated: ${JSON.stringify(obj)}`)
  res.json({ message: 'ok' })
})

app.post('/message-received', async (req, res) => {
  const obj = req.body.message
  console.log(`received message: ${JSON.stringify(obj)}`)

  if (obj.type === 'text') {
    await submitMessageReceipt(obj, 'viewed')
    const connectionId = obj.connectionId
    const content = obj.content as string

    if (content.startsWith('/echo')) {
      await sendTextMessage({ connectionId, content: `${content.substring(5)}` })
    } else if (content.startsWith('/context')) {
      sendRootMenu(obj.connectionId)
    } else if (content.startsWith('/menu')) {
      await sendQuestion({ connectionId: obj.connectionId, question: rootMenuAsQA })
    } else if (content.startsWith('/media')) {
      const body = {
        type: 'media',
        connectionId: obj.connectionId,
        description: 'An image',
        uri: `${content.substring(7)}` || `${PUBLIC_BASE_URL}/bunny.jpeg`,
        mimeType: 'image/jpeg', // TODO: take mime type from actual media
      }
      await submitMessage(body)
    } else if (content.startsWith('/proof')) {
      const body = {
        type: 'identity-proof-request',
        connectionId: obj.connectionId,
        requestedProofItems: [{ id: '1', type: 'verifiable-credential', value: {} }],
      }
      await submitMessage(body)
    } else if (content.startsWith('/rocky')) {
      await sendTextMessage({ connectionId, content: rockyQuotes[Math.floor(Math.random() * rockyQuotes.length)] })
    } else if (content.startsWith('/help')) {
      await sendTextMessage({ connectionId, content: helpMessage })
    } else {
      // Text message received but not understood
      await sendTextMessage({
        connectionId,
        content: 'I do not understand what you say. Write /help to get available commands',
      })
    }
  } else if (obj.type === 'menu-select') {
    await submitMessageReceipt(obj, 'viewed')
    await handleMenuSelection({ connectionId: obj.connectionId, item: obj.menuItems[0]?.id ?? 'nothing' })
  } else if (obj.type === 'contextual-menu-select') {
    await submitMessageReceipt(obj, 'viewed')
    // Refresh context menu
    await sendRootMenu(obj.connectionId)

    await handleMenuSelection({ connectionId: obj.connectionId, item: obj.selectionId ?? 'nothing' })
  } else if (obj.type === 'identity-proof-submit') {
    await submitMessageReceipt(obj, 'viewed')
    await sendTextMessage({
      connectionId: obj.connectionId,
      content: 'We have successfully received your proof submission. Enjoy the service!',
    })
  }

  res.json({ message: 'ok' })
})

export { app, server }
