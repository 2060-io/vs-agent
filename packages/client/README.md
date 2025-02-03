`@2060.io/service-agent-client`

# Service Agent Client
**Service Agent Client** is a TypeScript library designed to simplify the interaction with **Service Agent** (`@2060.io/service-agent-main`). It provides an abstraction layer for communicating with the agent, handling messaging, credential management, and event handling efficiently.

This package ensures that the client stays updated with the latest API versioning of the **Service Agent** to maintain compatibility with evolving endpoints.

## Features
- **Simplified API interaction:** Provides an easy-to-use client to interact with the Service Agent.
- **Event handling:** Includes an ExpressEventHandler for quick integration into Express-based applications.
- **Service-based structure:** Dedicated services for messaging, credentials, invitations, and revocation registries.
- **Versioning support:** Supports API versioning to maintain compatibility with different Service Agent versions.

## Repository
Find the public repository here: [2060 Service Agent](../../README.md)

## Installation
```sh
npm install @2060.io/service-agent-client
```
or 
```sh
yarn add @2060.io/service-agent-client
```
## `ApiClient.ts`
`ApiClient` class provides a simple interface for interacting with the Service Agent. It abstracts API calls and offers dedicated service methods for messaging, credential types, invitations, and revocation registries.

### Example Usage
```ts
import { ApiClient } from '@2060.io/service-agent-client'
import { ApiVersion } from '@2060.io/service-agent-client/types/enums'

const apiClient = new ApiClient('http://localhost:3000', ApiVersion.V1)

// Sending a message
const messageId = await apiClient.messages.send(
  new TextMessage({
  connectionId: 'connectionId',
  content: 'Hello, world!',
  })
)

console.log(`Message sent with ID: ${messageId}`)
```

### Services
- `messages:` Handles message sending and receiving.
- `credentialTypes:` Manages credential types.
- `revocationRegistry:` Manages revocation registries.
- `invitation:` Handles connection invitations.

## `ExpressEventHandler.ts`
The `ExpressEventHandler` simplifies event handling for Express applications, mapping API endpoints to event handlers.
### Example Usage
```ts
import express from 'express'
import { ExpressEventHandler } from '@2060.io/service-agent-client'

const app = express()
const eventHandler = new ExpressEventHandler(app)

expressHandler.messageStateUpdated(async (req, res) => {
  const obj = req.body
  logger.info(`message state updated: ${JSON.stringify(obj)}`)
  res.json({ message: 'ok' })
})

app.listen(3000, () => console.log('Server running on port 3000'))
```
### Available Event Handlers
- `connectionStateUpdated` (`POST /connection-state-updated`)
- `messageStateUpdated` (`POST /message-state-updated`)
- `messageReceived` (`POST /message-received`)

## Contributing
This library evolves alongside the Service Agent. Contributions are welcome!
- Fork the repository.
- Create a feature branch.
- Commit changes.
- Open a pull request.

For more details, visit the [official repository](https://github.com/2060-io/2060-service-agent).