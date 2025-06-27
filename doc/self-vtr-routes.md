# Self-Verifiable Trust Registry API (Self-Issued)

The `addSelfVtrRoutes` function provides a set of HTTP endpoints for working with **self-issued verifiable credentials and presentations** using JSON Schema. This approach simulates a trust registry where credentials are issued and validated by the same agent, without relying on an external registry.

---

## Usage

To enable these routes, call `addSelfVtrRoutes(app, agent, publicApiBaseUrl)` in your Express server setup:

```typescript
import { addSelfVtrRoutes } from './selfVtrRoutes'
// ...
addSelfVtrRoutes(app, agent, publicApiBaseUrl)
```

- `app`: Express application instance.
- `agent`: Instance of `VsAgent`.
- `publicApiBaseUrl`: Base URL for your public API.

---

## Endpoints

### POST `/self-vtr/upload/:schemaId`

Upload and validate credential data against a JSON schema.

- `:schemaId` must match an essential schema currently supported (e.g., `ecs-service`, `ecs-org`). Support for additional schemas is not available yet.
- The request body should match the schema's `credentialSubject` properties.
- The agent's DID is automatically set as the `id` field.

**Example:**
```bash
curl -X POST http://localhost:3001/self-vtr/upload/ecs-service \
  -H "Content-Type: application/json" \
  -d '{ "name": "Health Portal", ... }'
```

**Responses:**
- `200 OK`: Data is valid and accepted.
- `400 Bad Request`: Data is invalid.
- `404 Not Found`: Schema ID does not exist.

---

### GET `/self-vtr/cs/v1/js/:schemaId`

Retrieve the JSON schema for a given credential type.
> **Note:** Only currently supported ecs credential types (such as `ecs-service` or `ecs-org`) are available at this time.

**Example:**
```bash
curl http://localhost:3001/self-vtr/cs/v1/js/ecs-service
```

---

### GET `/self-vtr/ecs-service-c-vp.json`  
### GET `/self-vtr/ecs-org-c-vp.json`

Retrieve a signed Verifiable Presentation for ECS Service or Organization.

---

### GET `/self-vtr/schemas-example-service.json`  
### GET `/self-vtr/schemas-example-org.json`

Retrieve a signed Verifiable Credential for ECS Service or Organization.

---

### GET `/self-vtr/perm/v1/find_with_did?did=<did>`

Retrieve issuer permission type for a given DID (for testing).

**Example:**
```bash
curl "http://localhost:3001/self-vtr/perm/v1/find_with_did?did=did:example:123"
```

---

## Notes

- All schemas are loaded from `data.json` at startup.
- Uploaded data is validated against the corresponding JSON schema.
- Credentials and presentations are **self-issued** and **self-validated** by the agent.
- This is an approach for self-issued verifiable credentials and