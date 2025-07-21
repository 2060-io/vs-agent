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

## Configuration

To enable the Self-Verifiable Trust Registry API endpoints, you must set the following environment variables in your `.env` file or system environment. These variables control the agent's identity, endpoints, and the data used for example credentials:

| Variable                        | Description                                                      | Example Value                                  |
|----------------------------------|------------------------------------------------------------------|------------------------------------------------|
| `SELF_ISSUED_VTC_ORG_TYPE`               | Organization type for example credential                         | `PRIVATE`                                      |
| `SELF_ISSUED_VTC_ORG_COUNTRYCODE`        | Organization country code                                        | `CO`                                           |
| `SELF_ISSUED_VTC_ORG_REGISTRYID`         | Organization registry ID                                         | `1234567890`                                   |
| `SELF_ISSUED_VTC_ORG_REGISTRYURL`        | Organization registry URL                                        | `https://registro-empresas.ejemplo.com`        |
| `SELF_ISSUED_VTC_ORG_ADDRESS`            | Organization address                                             | `Calle Falsa 123, Bogotá, Colombia`            |
| `SELF_ISSUED_VTC_SERVICE_TYPE`           | Service type for example credential                             | `HealthCheckService`                           |
| `SELF_ISSUED_VTC_SERVICE_DESCRIPTION`    | Service description                                              | `Servicio de verificación de salud digital`     |
| `SELF_ISSUED_VTC_SERVICE_MINIMUMAGEREQUIRED` | Minimum age required for service                              | `18`                                           |
| `SELF_ISSUED_VTC_SERVICE_TERMSANDCONDITIONS` | Terms and conditions URL                                     | `https://servicio.ejemplo.com/terminos`        |
| `SELF_ISSUED_VTC_SERVICE_PRIVACYPOLICY`  | Privacy policy URL                                               | `https://servicio.ejemplo.com/privacidad`      |

> **Note:**  
> This Self-Verifiable Trust Registry API and its configuration are **provisional** and intended for testing and development only. These endpoints and related environment variables may be removed or changed in future releases **without prior notice**.
>
> The variables `AGENT_LABEL` and `AGENT_INVITATION_IMAGE_URL` will be used as the name and logo for services and credentials issued by the Self-Verifiable Trust Registry.

---

## Endpoints

### GET `/self-tr/cs/v1/js/:schemaId`

Retrieve the JSON schema for a given credential type.
> **Note:** Only currently supported ecs credential types (such as `ecs-service` or `ecs-org`) are available at this time.

**Example:**
```bash
curl http://localhost:3001/self-tr/cs/v1/js/ecs-service
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

- All schemas are loaded from `data.json` at startup.
- Uploaded data is validated against the corresponding JSON schema.
- Credentials and presentations are **self-issued** and **self-validated** by the agent.
- This is an approach for self-issued verifiable credentials and