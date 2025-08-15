# VS Agent

Verifiable Service Agent is a web application that allows to create Verifiable Services.

## Configuration

Most configuration of VS Agent is done by environment variables. These variables might be set also in `.env` file in the form of KEY=VALUE (one per line).

### Environment variables

In this section we will divide them depending on how likely different users will need to take into consideration.

#### Basic settings

These variables are usually important for every deployment, since they define how VS Agent will be accessed from the outside world (User Agents, other Verifiable Services and your controller, who will be managing its Admin API and receiving events from it):

| Variable                   | Description                                     | Default value           |
| -------------------------- | ----------------------------------------------- | ----------------------- |
| AGENT_PORT                 | Port where DIDComm agent will be running        | 3001                    |
| ADMIN_PORT                 | Administration interface port                   | 3000                    |
| AGENT_PUBLIC_DID           | Agent's public DID (in did:web format)          | none                    |
| AGENT_INVITATION_IMAGE_URL | Public URL for image to be shown in invitations | none                    |
| AGENT_LABEL                | Label to show to other DIDComm agents           | Test VS Agent           |
| EVENTS_BASE_URL            | Base URL for sending events                     | <http://localhost:5000> |

VS Agent includes a public and an administration interface, each running in ports 3001 and 3000 respectively (which could be overriden by setting `AGENT_PORT` and `ADMIN_PORT` in case you are running the application locally and these ports are used by other apps).

In order to make your agent reachable by other VS agents and user agents like Hologram, you need to expose your `AGENT_PORT` to the internet. You must define an `AGENT_PUBLIC_DID` matching external hostname (e.g. if your VS-A instance public interface is accessible in `https://myagent.com:3001` you must set AGENT_PUBLIC_DID to `did:web:myagent.com%3A3001`)

> **Note**: Although it is possible to run VS Agent without any public DID, it is mandatory to do so in order to make possible for the agent to create its own credential types and therefore issue credentials. Note that you'll need HTTPS in order to fully support did:web specification.
>
> Public DID will be used also for agents to easily connect to it using DIDComm without the need of creating an explicit invitation by doing a GET request to `/invitation` endpoint.
>
> If you don't specify a public DID, you might set up `PUBLIC_API_BASE_URL` and `AGENT_ENDPOINTS` manually.

You'll also need to set up an `AGENT_LABEL` and (optionally) an `AGENT_INVITATION_IMAGE_URL` so when DIDComm agents scan an invitation to your service they can identify it easily.

Besides these parameters, you are likely to use your VS Agent alongside a **controller** app that will be sending messages and also receiving events from it (such as new messages arrived, new connections, etc.). For that purpose, you'll need to set up an `EVENTS_BASE_URL` for your VS Agent to be able to send WebHooks to it. See the [VS Agent API document](../../doc//vs-agent-api.md#events) for more information about the API your backend needs to implement (if you are not using the handy [JS](../../packages/client) or [NestJS](../../packages/nestjs-client) client packages).

#### Database access settings

These are variables that you are likely to use when going into production, since you don't want to use dummy credentials and also you'll probably want to use external components to improve horizontal scalability.

| Variable                | Description                                                                                                                 | Default value     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| AGENT_WALLET_ID         | ID for agent wallet                                                                                                         | test-vs-agent     |
| AGENT_WALLET_KEY        | Key for agent wallet                                                                                                        | test-vs-agent     |
| POSTGRES_HOST           | PosgreSQL database host                                                                                                     | None (use SQLite) |
| POSTGRES_USER           | PosgreSQL database username                                                                                                 | None              |
| POSTGRES_PASSWORD       | PosgreSQL database password                                                                                                 | None              |
| POSTGRES_ADMIN_USER     | PosgreSQL database admin user                                                                                               | None              |
| POSTGRES_ADMIN_PASSWORD | PosgreSQL database admin password                                                                                           | None              |
| REDIS_HOST              | Redis host used for message caching and asynchronous processing. The system requires this for production-ready performance. | None              |
| REDIS_PASSWORD          | Password for connecting to the Redis instance.                                                                              | None              |

VS Agent supports two database backends:

- SQLite: suitable for demos and local testing
- Postgres: suitable for production environment

If you want to use SQLite, you won't need to care about any of these variables: VS Agent will create a local database using `AGENT_WALLET_ID` name and ciphering it using `AGENT_WALLET_KEY`. Usually it is safe to keep the default values, unless you'll want to set up multiple VS Agents in the same computer (in such case, just use different `AGENT_WALLET_ID` for each).

On the other hand, if you go to production, you'll likely want to use a PostgreSQL DB, which will be used as soon as you set `POSTGRES_HOST` environment variable. Make sure to:

- define AGENT_WALLET_ID and AGENT_WALLET_KEY, since the ID will be used as the name of the database that will be used to store VS Agent wallet
- define the other `POSTGRES_*` parameters, including the ones for administration in case VS Agent wallet's database is not yet created in your Postgres host. You might skip using these parameters if your DBA creates this database beforehand and gives permissions to `POSTGRES_USER`.

Another thing you'll likely to do if you go to production is to enable message caching and asynchronous processing, which is done by using Redis.
By offloading message handling and enabling asynchronous processing, Redis helps optimize I/O operations and significantly enhances the service's capacity to manage large volumes of data efficiently. Point your `REDIS_HOST` and `REDIS_PASSWORD` environment variables to an instance accessible by VS Agent.

#### Debugging/development variables

Here is a couple of variables that you may want to take care in case of troubles or working in development environments.

| Variable        | Description                                                          | Default value |
| --------------- | -------------------------------------------------------------------- | ------------- |
| AGENT_LOG_LEVEL | Credo Agent Log level                                                | 4 (warn)      |
| ADMIN_LOG_LEVEL | Admin interface Log level                                            | 2 (debug)     |
| USE_CORS        | Enable Cross-Origin Resource Sharing (only for development purposes) | false         |

Possible log levels:

- 0: test
- 1: trace
- 2: debug
- 3: info
- 4: warn
- 5: error
- 6: fatal
- 7: off

#### Advanced/specific use variables

These are variables that are updated only on specific use cases.

| Variable                               | Description                                                                                                                                                                                                                | Default value            |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| PUBLIC_API_BASE_URL                    | Base URL for public API (e.g. invitations, short URLs). Used when no public DID is defined or you want to override it                                                                                                      | <http://localhost:3001>  |
| AGENT_ENDPOINTS                        | Comma-separeated list of endpoints where agent DIDComm endpoints will be accessible (including protocol and port). Used when no public DID is defined or you want to override it                                           | ws://localhost:3001      |
| AGENT_WALLET_KEY_DERIVATION_METHOD     | Wallet key derivation method: ARGON2I_INT, ARGON2_MOD or RAW                                                                                                                                                               | ARGON2I_MOD              |
| AGENT_INVITATION_BASE_URL              | Public URL for fallback when no DIDComm agent is found                                                                                                                                                                     | <https://hologram.zone/> |
| REDIRECT_DEFAULT_URL_TO_INVITATION_URL | Default redirect to AGENT_INVITATION_BASE_URL                                                                                                                                                                              | true                     |
| USER_PROFILE_AUTODISCLOSE              | Whether to disclose User Profile when requested by another agent. If not set, User Profile can manually be sent by using a Profile message                                                                                 | false                    |
| MASTER_LIST_CSCA_LOCATION              | **Enables the eMRTD verification module**. Location (URL or absolute path) of the CSCA Master List in **LDIF** format When set, VS Agent loads trust anchors at startup and activates ePassport verification capabilities. | none                     |

> **Note about Key derivation method**: By default, we use the strongest ARGON2I_MOD, but since this is the slowest one as well, depending on the security infrastructure you have, you might want to not derive the key at all (use RAW). However, in versions of VS Agent we are going to deprecate this setting, so we recommend to keep the default setting to make migration process easier.

### Agent feature discovery

When connecting to other agents, VS-A tries to get information from them in order to know what capabilities they support and adapt the flow to it. For example, it can request for user's preferred language to send messages using their locale, or NFC reading capability, to ask users to tap NFC tags and read their content (or fall back to another method in case they don't support that).

VS-A fetches capabilities from the `discovery.json` file (which is located at at `/www/apps/vs-agent/discovery.json` in the deployed container) to determine available features. If you want to customize the capabilities to look for, replace the volume at this path with your own `discovery.json` file.

### Self VR

To enable the Self-Verifiable Trust Registry API endpoints, you must set the following environment variables in your `.env` file or system environment. These variables control the agent's identity, endpoints, and the data used for example credentials:

| Variable                                     | Description                              | Example Value                               |
| -------------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| `SELF_ISSUED_VTC_ORG_TYPE`                   | Organization type for example credential | `PRIVATE`                                   |
| `SELF_ISSUED_VTC_ORG_COUNTRYCODE`            | Organization country code                | `CO`                                        |
| `SELF_ISSUED_VTC_ORG_REGISTRYID`             | Organization registry ID                 | `1234567890`                                |
| `SELF_ISSUED_VTC_ORG_REGISTRYURL`            | Organization registry URL                | `https://registro-empresas.ejemplo.com`     |
| `SELF_ISSUED_VTC_ORG_ADDRESS`                | Organization address                     | `Calle Falsa 123, Bogotá, Colombia`         |
| `SELF_ISSUED_VTC_SERVICE_TYPE`               | Service type for example credential      | `HealthCheckService`                        |
| `SELF_ISSUED_VTC_SERVICE_DESCRIPTION`        | Service description                      | `Servicio de verificación de salud digital` |
| `SELF_ISSUED_VTC_SERVICE_MINIMUMAGEREQUIRED` | Minimum age required for service         | `18`                                        |
| `SELF_ISSUED_VTC_SERVICE_TERMSANDCONDITIONS` | Terms and conditions URL                 | `https://servicio.ejemplo.com/terminos`     |
| `SELF_ISSUED_VTC_SERVICE_PRIVACYPOLICY`      | Privacy policy URL                       | `https://servicio.ejemplo.com/privacidad`   |

> **Note:**  
> This Self-Verifiable Trust Registry API and its configuration are **unstable** and intended for testing and development only. These endpoints and related environment variables may be removed or changed in future releases **without prior notice**.
>
> The variables `AGENT_LABEL` and `AGENT_INVITATION_IMAGE_URL` will be used as the name and logo for services and credentials issued by the Self-Verifiable Trust Registry.

For **more examples of how to configure these variables and use the API**, see the additional file [Self-Verifiable Trust Registry routes](../../doc/self-tr-routes.md).

### eMRTD (ePassport) verification

The **eMRTD verification module** allows VS Agent to verify the authenticity and integrity of electronic Machine Readable Travel Documents (ePassports). When enabled, the agent will load CSCA (Country Signing Certification Authority) trust anchors from a **Master List** and verify the `EF.SOD` digital signature and data group hashes (for example, `DG1`, `DG2`).

#### Master List format and location

- **Format:** The Master List **must be in LDIF** format (`.ldif`). Other formats are not supported.
- **Location:** Provide the location via `MASTER_LIST_CSCA_LOCATION` using one of the following:
  - `https://...` — fetch over HTTPS on startup.
  - `file:///...` — local file through a file URL.
  - Absolute path — e.g., `/opt/icao/csca.ldif` inside the container/host.
- **Where to get it:** The official ICAO Master List can be downloaded from [https://pkddownloadsg.icao.int/](https://pkddownloadsg.icao.int/)

#### How it works

1. On startup, VS Agent checks the environment variable `MASTER_LIST_CSCA_LOCATION`.
2. If present, the agent parses the Master List and loads the CSCA certificates as trust anchors.
3. During verification, the agent validates the `EF.SOD` signature against the DS certificate chain anchored in the CSCA and verifies the integrity of the referenced Data Groups by recomputing and comparing the digests.
4. Verification results are made available to the internal flows of VS Agent (exact endpoints and payloads depend on your integration).

> **Important:**

- The Master List must be a valid `.ldif` file containing CSCA certificates. Make sure the file is present inside the running container or host environment and readable by the process user.

- If MASTER_LIST_CSCA_LOCATION is not set, the eMRTD Authenticity & Integrity Verification remains disabled and the agent only send EMrtd data parsed.

- For more information about authenticity & integrity verification, see: [credo-ts-didcomm-mrtd Authenticity & Integrity Verification](https://github.com/2060-io/credo-ts-didcomm-ext/blob/main/packages/mrtd/docs/mrtd-authenticity-integrity.md).

#### Enabling the module

Set the environment variable pointing to the Master List file:

```bash
# .env example
MASTER_LIST_CSCA_LOCATION=/opt/vs-agent/icao/ML_ICAO_2025-07-10.ldif
MASTER_LIST_CSCA_LOCATION=https://pkddownloadsg.icao.int/file?id=f6e328050fd481060e787569dd8e998c43f14230
```

## Deploy and run

vs-agent can be run both locally or containerized.

### Locally

vs-agent can be built and run on localhost by just setting the corresponding variables and executing:

```bash
pnpm build
pnpm dev
```

Upon a successful start, the following lines should be read in log:

```bash
VS Agent running in port xxxx. Admin interface at port yyyy
```

This means that VS-A is up and running!

### Using docker

First of all, a docker image must be created by doing:

```bash
docker build -t vs-agent:[tag] .
```

Then, a container can be created and deployed:

```bash
docker run -e AGENT_PUBLIC_DID=... -e AGENT_ENDPOINT=... -e AGENT_PORT=yyy -e USE_CORS=xxx -p yyy:xxx vs-agent:[tag]
```

where yyy is an publicly accesible port from the host machine.

## API

For the moment, some details about VS-A API can be found in this [Document](./doc/vs-agent-api.md). There is some work in progress to make the API available within Swagger: when deployed, just go to [VS_AGENT_ADMIN_BASE_URL]/api.
