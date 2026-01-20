`@verana-labs/vs-agent-model`
# VS Agent Model

This package provides the data models used by **VS Agent** and its related services and libraries within the `@2060.io` ecosystem. These models are essential for chatbot development and facilitate integration with the broader system.

## Packages Using This Library

The models in this package are used by the following services and libraries:

- **[@verana-labs/vs-agent](../../apps/vs-agent/README.md)** – VS Agent.
- **[@verana-labs/vs-agent-nestjs-client](../nestjs-client/README.md)** – A NestJS client for interacting with VS Agent.
- **[@verana-labs/vs-agent-client](../client/README.md)** – A general-purpose API client for VS Agent.


## Usage

This package defines essential models that support structured communication and event handling within the VS Agent ecosystem. It is designed to be used by chatbot services and other integrations that rely on a standardized message format.

## How to work
```mermaid
classDiagram
    class VsAgent {
        + Handles DIDComm communication
        + Manages agent wallet and credentials
        + Exposes API for client interactions
    }

    class NestJSClient {
        + Plug-and-play integration
        + Selectable modules for various services
        + Modules:
        -- MessageEventOptions: Configures message event handling
        -- ConnectionEventOptions: Configures connection event handling
        -- CredentialOptions: Configures credential management
        -- StatsOptions: Configures stats management
    }

    class Client {
        + Directly manages requests to SA
        + Facilitates reception of requests from modules
        + Provides an abstraction for service communication
        + Interfaces:
        -- messages
        -- credentialTypes
        -- revocationRegistries
        -- invitations
    }

    class ModelLibrary {
        + Defines required data models
        + Ensures type safety across services
    }

    %% Relations
    NestJSClient --> VsAgent : Uses
    Client --> VsAgent : Sends requests
    Client --> VsAgent : Receives requests
    Client --> ModelLibrary : Uses models
    ModelLibrary --> VsAgent : Provides data models
    NestJSClient --> ModelLibrary : Uses models

    %% Style
    style ModelLibrary stroke:#333,stroke-width:4px
```

### Installation

```sh
npm install @verana-labs/vs-agent-model
```
or
```sh
yarn add @verana-labs/vs-agent-model
or
```sh
pnpm add @verana-labs/vs-agent-model
```

## Example

Importing and using a message model:

```typescript
import { CallOfferRequestMessage } from '@verana-labs/vs-agent-model';

const callOffer = new CallOfferRequestMessage({
    connectionId: 'connectionId',
    description: 'Start call',
    parameters: { wsUrl, roomId, peerId },
});

console.log(callOffer);
```
