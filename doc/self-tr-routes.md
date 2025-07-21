# Self-Verifiable Trust Registry API (Self-Issued)

The `addSelfTrRoutes` function provides a set of HTTP endpoints for working with **self-issued verifiable credentials and presentations** using JSON Schema. This approach simulates a trust registry where credentials are issued and validated by the same agent, without relying on an external registry.

---

## Usage

To enable these routes, call `addSelfTrRoutes(app, agent, publicApiBaseUrl)` in your Express server setup:

```typescript
import { addSelfTrRoutes } from './selfTrRoutes'
// ...
addSelfTrRoutes(app, agent, publicApiBaseUrl)
```

- `app`: Express application instance.
- `agent`: Instance of `VsAgent`.
- `publicApiBaseUrl`: Base URL for your public API.

---

## Endpoints

### GET `/self-tr/v1/cs/js/:schemaId`

Retrieve the JSON schema for a given credential type.
> **Note:** Only currently supported ecs credential types (such as `ecs-service` or `ecs-org`) are available at this time.

**Example:**
```bash
curl http://localhost:3001/self-tr/v1/cs/js/ecs-service
```

---

### GET `/self-tr/ecs-service-c-vp.json`  
### GET `/self-tr/ecs-org-c-vp.json`

Retrieve a signed Verifiable Presentation for ECS Service or Organization.

---

### GET `/self-tr/schemas-example-service.json`  
### GET `/self-tr/schemas-example-org.json`

Retrieve a signed Verifiable Credential for ECS Service or Organization.

---

### GET `/self-tr/perm/v1/find_with_did?did=<did>`

Retrieve issuer permission type for a given DID (for testing).

**Example:**
```bash
curl "http://localhost:3001/self-tr/perm/v1/find_with_did?did=did:example:123"
```

---

## Notes

- All schemas are loaded from `data.ts` at startup.
- Uploaded data is validated against the corresponding JSON schema.
- Credentials and presentations are **self-issued** and **self-validated** by the agent.
- This is an approach for self-issued verifiable credentials and