# VS Agent Helm Chart

This Helm chart deploys **VS Agent** application with a StatefulSet, supporting private and public ingress, persistent storage, and configurable environment variables. It is designed to be flexible, supporting PostgreSQL and Redis integrations.

## Features

* Deploys VS-Agent with configurable replicas
* Supports private and public ingress with TLS certificates via cert-manager
* Persistent storage using PersistentVolumeClaim with customizable storage class and size
* Configurable environment variables for agent ports, endpoints, and external services
* Optional PostgreSQL and Redis support
* Customizable deployment color label for easy versioning or environment differentiation

## Kubernetes Resources

* **Service:** Exposes two TCP ports, one for the agent (`didcomm`) and one for admin access.
* **Ingress:**
  * Public ingress for external access with TLS
* **PersistentVolumeClaim:** Provides persistent storage for agent data.
* **StatefulSet:** Runs the VS-Agent container(s) with configurable replicas.

## Configuration

### General

| Parameter                      | Description                                 | Default       |
| ------------------------------ | ------------------------------------------- | ------------- |
| `name`                         | Application name                            | `vs-agent`    |
| `namespace`                    | Kubernetes namespace                        | `default`     |
| `replicas`                     | Number of agent pods                        | `1`           |
| `domain`                       | Domain for ingress hosts                    | `example.com` |

### Ports

| Parameter     | Description                              | Default |
| ------------- | ---------------------------------------- | ------- |
| `adminPort`   | Port for admin interface                 | `3000`  |
| `didcommPort`   | Port for agent communication (`didcomm`) | `3001`  |

### Didcomm Configuration

| Parameter                  | Description                                      | Default                          |
| -------------------------- | ------------------------------------------------ | -------------------------------- |
| `didcommLabel`                | Label for the agent                              | `VS Agent`                      |
| `eventsBaseUrl`            | Base URL for events                              | `https://events.example.com`    |
| `didcommInvitationImageUrl`  | URL for the agent invitation image               | `https://example.com/invitation.png` |
| `extraEnv`                 | Additional environment variables for the agent   | `[]`                            |

### Database Configuration (Optional)

| Parameter                  | Description                                      | Default                          |
| -------------------------- | ------------------------------------------------ | -------------------------------- |
| `database.enabled`         | Enable PostgreSQL database                       | `false`                         |
| `database.user`            | PostgreSQL username                              | `unicid`                        |
| `database.pwd`             | PostgreSQL password                              | `mypassword123`                 |

### Redis Configuration (Optional)

| Parameter                  | Description                                      | Default                          |
| -------------------------- | ------------------------------------------------ | -------------------------------- |
| `redis.enabled`            | Enable Redis                                     | `false`                         |
| `redis.host`               | Redis host                                       | `your-redis-host`               |
| `redis.password`           | Redis password                                   | `myRedisPass123`                |

### Persistent Storage

| Parameter                  | Description                                      | Default                          |
| -------------------------- | ------------------------------------------------ | -------------------------------- |
| `storage.size`             | Size of the persistent volume for the agent      | `1Gi`                           |
| `storage.storageClassName` | Storage class for the persistent volume          | `csi-cinder-high-speed`         |

### Ingress

| Parameter                      | Description                                 | Default       |
| ------------------------------ | ------------------------------------------- | ------------- |
| `ingress.public.enableCors`    | Enable CORS for public ingress              | `true`        |

### Extra Environment Variables

Add additional environment variables to the agent container with `extraEnv`:

```yaml
extraEnv:
  - name: CUSTOM_ENV_VAR
    value: custom-value
```

## Usage

1. Update values in your `values.yaml` file as needed.
2. Install or upgrade the chart using Helm:

```bash
helm upgrade --install vs-agent ./vs-agent-chart -n your-namespace -f values.yaml
```

3. Monitor pods and ingress resources to ensure deployment success.

4. To uninstall and remove the deployment:

```bash
helm uninstall vs-agent -n your-namespace
```

This will delete all resources created by the chart in the specified namespace.

