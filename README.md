# 2060-service-agent

2060 Agent running in a container, used as gateway for any service to access 2060 ecosystem.

## Configuration

At the moment, all configuration is done by environment variables. All of them are optional for development
but likely needed for production and test deployments. 

| Variable | Description | Default value |
|----------|------------ | ------------- | 
| AGENT_ENDPOINT | Public endpoint where agent DIDComm endpoints will be accessible (including protocol and port) | ws://localhost:3001 |
| AGENT_ENDPOINTS | List of endpoints where agent DIDComm endpoints will be accessible (including protocol and port), comma separated | ws://localhost:3001 |
| AGENT_INVITATION_IMAGE_URL | Public URL for image to be shown in invitations | none |
| AGENT_INVITATION_BASE_URL | Public URL for fallback when no DIDComm agent is found | https://2060.io/i |
| AGENT_PUBLIC_DID | Agent's public DID (in did:web format) | none |
| AGENT_PORT | Port where DIDComm agent will be running | 3001 |
| AGENT_LOG_LEVEL | Aries Agent Log level | 4 (warn) |
| ENABLE_WS | Enable Web Socket transport for Agent | true |
| ENABLE_HTTP | Enable HTTP transport for Agent | true |
| AGENT_NAME | Label to show to other DIDComm agents | Test Service Agent |
| USE_CORS | Enable Cross-Origin Resource Sharing (only for development purposes) | false |
| ANONCREDS_SERVICE_BASE_URL | AnonCreds Service base URL | none |
| ADMIN_PORT | Administration interface port | 3000 |
| ADMIN_LOG_LEVEL | Admin interface Log level | 2 (debug) |
| EVENTS_BASE_URL | Base URL for sending events | http://localhost:5000 |

> **Note**: While not mandatory, it is recommended to set an agent public DID matching external hostname (e.g. if your Service Agent instance is accessable in `https://myagent.com:3000` you must set AGENT_PUBLIC_DID to `did:web:myagent.com%3A3000`), which will make possible for the agent to create its own creadential types and therefore issue credentials. Note that you'll need HTTPS in order to fully support did:web specification.
> 
> Public DID will be used also for agents to easily connect to it using DIDComm without the need of creating an explicit invitation by doing a GET request to `/invitation` endpoint.

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

2060-service-agent can be run both locally or containerized.

### Locally

2060-service-agent can be built and run on localhost by just setting the corresponding variables and executing:

```
yarn build
yarn dev
```

Upon a successful start, the following lines should be read in log:

```
Service Agent running in port xxxx. Admin interface at port yyyy
```

This means that Service Agent is up and running!

### Using docker

First of all, a docker image must be created by doing:

```
docker build -t 2060-service-agent:[tag] .
```

Then, a container can be created and deployed:

```
docker run -e AGENT_PUBLIC_DID=... -e AGENT_ENDPOINT=... -e AGENT_PORT=yyy -e USE_CORS=xxx -p yyy:xxx 2060-service-agent:[tag]
```

where yyy is an publicly accesible port from the host machine.