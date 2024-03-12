import express from 'express'
import cors from 'cors'
import path from 'path'
import fetch from 'node-fetch'

const PORT = Number(process.env.PORT || 3002)
const SERVICE_AGENT_BASE_URL = process.env.SERVICE_AGENT_ADMIN_BASE_URL || 'http://localhost:3000'

const app = express()

const staticDir = path.join(__dirname, 'public')
app.use(express.static(staticDir))

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.set('json spaces', 2)

let phoneNumberCredentialDefinitionId: string

export const createCredentialType = async (name: string, version: string, attributes: string[]) => {
  const body = {
    name,
    version,
    attributes,
  }

  const response = await fetch(`${SERVICE_AGENT_BASE_URL}/credential-types/create-credential-type`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { accept: 'application/json', 'Content-Type': 'application/json' },
  })

  return (await response.json()).id
}

export interface CredentialTypeInfo {
  id: string
  name: string
  version: string
  attributes: string[]
  schemaId?: string
}

export const getCredentialTypes = async () => {
  const response = await fetch(`${SERVICE_AGENT_BASE_URL}/credential-types`, {
    method: 'GET',
    headers: { accept: 'application/json', 'Content-Type': 'application/json' },
  })

  const types = await response.json()

  if (!Array.isArray(types)) {
    throw new Error('Invalid response from Service Agent')
  }
  return types.map((value) => value as CredentialTypeInfo)
}

const server = app.listen(PORT, async () => {
  console.log(`Dummy phone number verification service started on port ${PORT}`)
  const credentialTypes = await getCredentialTypes()

  const phoneNumberCredentialType = credentialTypes.find(
    (type) => type.name === 'phoneNumber' && type.version === '1.0'
  )

  phoneNumberCredentialDefinitionId =
    phoneNumberCredentialType?.id ?? (await createCredentialType('phoneNumber', '1.0', ['phoneNumber']))
  console.log(`phoneNumberCredentialDefinitionId: ${phoneNumberCredentialDefinitionId}`)

  if (!phoneNumberCredentialDefinitionId) {
    throw new Error('Could not create or retrieve phone number credential type')
  }
})

export const submitMessage = async (body: unknown) => {
  await new Promise((res) => setTimeout(res, 1000))
  await fetch(`${SERVICE_AGENT_BASE_URL}/message`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const submitProofResult = async (connectionId: string, threadId: string, id: string, type: string, code: string) => {
  const proofResultBody = {
    type: 'identity-proof-result',
    connectionId,
    threadId,
    proofItemResults: [{ id, type, value: { code } }],
  }
  await submitMessage(proofResultBody)
}

app.post('/connection-state-updated', async (req, res) => {
  const obj = req.body
  console.log(`connection state update: ${JSON.stringify(obj)}`)
  res.json({ message: 'ok' })
})

app.post('/message-received', async (req, res) => {
  const obj = req.body.message
  console.log(`received message: ${JSON.stringify(obj)}`)

  if (obj.type === 'credential-request') {
    const expirationTime = new Date(Date.now())
    expirationTime.setTime(expirationTime.getTime() + 60 * 1000)

    const body = {
      type: 'identity-proof-request',
      connectionId: obj.connectionId,
      threadId: obj.threadId,
      requestedProofItems: [
        { id: '1', type: 'authorization-code', value: { expirationTime: expirationTime.toISOString() } },
      ],
    }
    console.log(`submitting ${JSON.stringify(body)}`)
    await submitMessage(body)
  } else if (obj.type === 'identity-proof-submit') {
    const submittedProofItem = obj.submittedProofItems.find(
      (item: { type: string }) => item.type === 'authorization-code'
    )
    if (submittedProofItem) {
      const expirationTime = new Date(submittedProofItem.value.expirationTime as string).getTime()
      const code = submittedProofItem.value.code as string
      const refreshRequested = submittedProofItem.value.refreshRequested as boolean

      if (refreshRequested) {
        const expirationTime = new Date(Date.now())
        expirationTime.setTime(expirationTime.getTime() + 60 * 1000)

        const body = {
          type: 'identity-proof-request',
          connectionId: obj.connectionId,
          threadId: obj.threadId,
          requestedProofItems: [
            { id: '1', type: 'authorization-code', value: { expirationTime: expirationTime.toISOString() } },
          ],
        }
        console.log(`refresh requested. Submitting ${JSON.stringify(body)}`)
        await submitMessage(body)
      } else if (Date.now() > expirationTime) {
        // send timeout error
        await submitProofResult(
          obj.connectionId,
          obj.threadId,
          submittedProofItem.id,
          submittedProofItem.type,
          'expired'
        )
      } else if (code !== '123456') {
        // send mismatch error
        await submitProofResult(
          obj.connectionId,
          obj.threadId,
          submittedProofItem.id,
          submittedProofItem.type,
          'mismatch'
        )
      } else {
        // send ok result + credential issuance
        await submitProofResult(obj.connectionId, obj.threadId, submittedProofItem.id, submittedProofItem.type, 'ok')

        const body = {
          type: 'credential-issuance',
          connectionId: obj.connectionId,
          threadId: obj.threadId,
          credentialDefinitionId: phoneNumberCredentialDefinitionId,
        }

        await submitMessage(body)
      }
    }
  }

  res.json({ message: 'ok' })
})

export { app, server }
