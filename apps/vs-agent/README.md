# Verifiable Service Agent (VS-A)

2060 Agent running in a container, used as gateway for any service to access 2060 ecosystem.

## Configuration

At the moment, all configuration is done by environment variables. All of them are optional for development
but likely needed for production and test deployments.

| Variable                   | Description                                                                                                       | Default value         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------- |
| AGENT_ENDPOINT             | Public endpoint where agent DIDComm endpoints will be accessible (including protocol and port)                    | ws://localhost:3001   |
| AGENT_ENDPOINTS            | List of endpoints where agent DIDComm endpoints will be accessible (including protocol and port), comma separated | ws://localhost:3001   |
| AGENT_INVITATION_IMAGE_URL | Public URL for image to be shown in invitations                                                                   | none                  |
| AGENT_INVITATION_BASE_URL  | Public URL for fallback when no DIDComm agent is found                                                            | https://hologram.zone/     |
| REDIRECT_DEFAULT_URL_TO_INVITATION_URL  | Default redirect to AGENT_INVITATION_BASE_URL                                                             | https://hologram.zone/     |
| AGENT_PUBLIC_DID           | Agent's public DID (in did:web format)                                                                            | none                  |
| AGENT_PORT                 | Port where DIDComm agent will be running                                                                          | 3001                  |
| AGENT_LOG_LEVEL            | Aries Agent Log level                                                                                             | 4 (warn)              |
| ENABLE_WS                  | Enable Web Socket transport for Agent                                                                             | true                  |
| ENABLE_HTTP                | Enable HTTP transport for Agent                                                                                   | true                  |
| USER_PROFILE_AUTODISCLOSE | Whether to disclose User Profile when requested by another agent. If not set, User Profile can manually be sent by using a Profile message | false                  |
| AGENT_LABEL                 | Label to show to other DIDComm agents                                                                             | Test VS Agent    |
| AGENT_WALLET_ID                 | ID for agent wallet                                                                             | test-vs-agent    |
| AGENT_WALLET_KEY                 | Key for agent wallet                                                                             | test-vs-agent    |
| AGENT_WALLET_KEY_DERIVATION_METHOD | Wallet key derivation method: ARGON2I_INT, ARGON2_MOD or RAW | ARGON2I_MOD |
| AGENT_NAME                 | Label to show to other DIDComm agents. Also used as Wallet ID and key. DEPRECATED: Use AGENT_LABEL, AGENT_WALLET_ID and AGENT_WALLET_KEY instead                                                                             | Test VS Agent    |
| USE_CORS                   | Enable Cross-Origin Resource Sharing (only for development purposes)                                              | false                 |
| ANONCREDS_SERVICE_BASE_URL | AnonCreds Service base URL                                                                                        | none                  |
| PUBLIC_API_BASE_URL            | Base URL for public API (e.g. invitations, short URLs)                                                            | http://localhost:3001 |
| ADMIN_PORT                 | Administration interface port                                                                                     | 3000                  |
| ADMIN_LOG_LEVEL            | Admin interface Log level                                                                                         | 2 (debug)             |
| EVENTS_BASE_URL            | Base URL for sending events                                                                                       | http://localhost:5000 |
| POSTGRES_HOST             | PosgreSQL database host                                                                                             | None (use SQLite)               |
| POSTGRES_USER             | PosgreSQL database username                                                                                         | None                            |
| POSTGRES_PASSWORD         | PosgreSQL database password                                                                                         | None                            |
| POSTGRES_ADMIN_USER       | PosgreSQL database admin user                                                                                       | None                            |
| POSTGRES_ADMIN_PASSWORD   | PosgreSQL database admin password                                                                                   | None                            |
| REDIS_HOST       | Redis host used for message caching and asynchronous processing. The system requires this for production-ready performance.                                                                                       | None                            |
| REDIS_PASSWORD   | Password for connecting to the Redis instance.                                                                                   | None                            |


> **Note**: While not mandatory, it is recommended to set an agent public DID matching external hostname (e.g. if your VS-A instance is accessable in `https://myagent.com:3000` you must set AGENT_PUBLIC_DID to `did:web:myagent.com%3A3000`), which will make possible for the agent to create its own creadential types and therefore issue credentials. Note that you'll need HTTPS in order to fully support did:web specification.
>
> Public DID will be used also for agents to easily connect to it using DIDComm without the need of creating an explicit invitation by doing a GET request to `/invitation` endpoint.
>
VS-A fetches capabilities from the `discovery.json` file at `/www/packages/main/discovery.json` to determine available features. To customize the capabilities, replace the volume at this path with your own `discovery.json` file. This allows flexibility for defining different capabilities.

If the `POSTGRES_HOST` environment variable is defined, VS-A will handle the connection to operate with the specified database. Please note that this type of persistence is recommended because by default, an SQLite database is used for testing purposes. Due to SQLite's lack of robustness, it does not support a high throughput of messages per second. Therefore, for any production deployment, it is recommended to use a more robust PostgreSQL database, which allows processing large volumes of data efficiently and properly managing existing data and security credentials.  

If the `REDIS_HOST` environment variable is defined, VS-A can leverage Redis as a caching system to achieve high-performance message processing. By offloading message handling and enabling asynchronous processing, Redis helps optimize I/O operations and significantly enhances the service’s capacity to manage large volumes of data efficiently.

Possible log levels:

- 0: test
- 1: trace
- 2: debug
- 3: info
- 4: warn
- 5: error
- 6: fatal
- 7: off

These variables might be set also in `.env` file in the form of KEY=VALUE (one per line).

## Deploy and run

vs-agent can be run both locally or containerized.

### Locally

vs-agent can be built and run on localhost by just setting the corresponding variables and executing:

```
pnpm build
pnpm dev
```

Upon a successful start, the following lines should be read in log:

```
VS Agent running in port xxxx. Admin interface at port yyyy
```

This means that VS-A is up and running!

### Using docker

First of all, a docker image must be created by doing:

```
docker build -t vs-agent:[tag] .
```

Then, a container can be created and deployed:

```
docker run -e AGENT_PUBLIC_DID=... -e AGENT_ENDPOINT=... -e AGENT_PORT=yyy -e USE_CORS=xxx -p yyy:xxx vs-agent:[tag]
```

where yyy is an publicly accesible port from the host machine.

## API

For the moment, some details about VS-A API can be found in this [Document](./doc/vs-agent-api.md). There is some work in progress to make the API available within Swagger: when deployed, just go to [VS_AGENT_ADMIN_BASE_URL]/api.