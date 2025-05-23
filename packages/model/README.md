`@2060.io/service-agent-model`
# Service Agent Model

This package provides the data models used by **Service Agent** and its related services and libraries within the `@2060.io` ecosystem. These models are essential for chatbot development and facilitate integration with the broader system.

## Packages Using This Library

The models in this package are used by the following services and libraries:

- **[@2060.io/service-agent-main](../../README.md)** – The core Service Agent.
- **[@2060.io/service-agent-nestjs-client](../nestjs-client/README.md)** – A NestJS client for interacting with the Service Agent.
- **[@2060.io/service-agent-client](../client/README.md)** – A general-purpose api client for the Service Agent.


## Usage

This package defines essential models that support structured communication and event handling within the Service Agent ecosystem. It is designed to be used by chatbot services and other integrations that rely on a standardized message format.

## How to work
```plantuml
@startuml

package "2060 Ecosystem" {
    package "Service Agent (SA)" {
        class ServiceAgent {
            + Handles DIDComm communication
            + Manages agent wallet and credentials
            + Exposes API for client interactions
        }
    }
    
    package "Libraries" {
        class NestJSClient {
            + Plug-and-play integration
            + Selectable modules for various services
            + Modules:
              -- MessageEventOptions: Configures message event handling
              -- ConnectionEventOptions: Configures connection event handling
              -- CredentialOptions: Configures credential management
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
        class ModelLibrary ##red {
            + Defines required data models
            + Ensures type safety across services
        }
    }
}

NestJSClient --> ServiceAgent : Uses
Client --> ServiceAgent : Sends requests
Client --> ServiceAgent : Receives requests
Client --> ModelLibrary : Uses models
ModelLibrary --> ServiceAgent : Provides data models
NestJSClient --> ModelLibrary : Uses models

@enduml
```

### Installation

```sh
npm install @2060.io/service-agent-model
```
or
```sh
yarn add @2060.io/service-agent-model
or
```sh
pnpm add @2060.io/service-agent-model
```

## Example

Importing and using a message model:

```typescript
import { CallOfferRequestMessage } from '@2060.io/service-agent-model';

const callOffer = new CallOfferRequestMessage({
    connectionId: 'connectionId',
    description: 'Start call',
    parameters: { wsUrl, roomId, peerId },
});

console.log(callOffer);
```
