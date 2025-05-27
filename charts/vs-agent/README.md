# VS Agent Helm Chart

This Helm chart deploys the **VS-Agent** application with a StatefulSet, supporting private and public ingress, persistent storage, and configurable environment variables. It is designed to be flexible, supporting PostgreSQL and Redis integrations.

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
  * Private ingress restricted by IP whitelist
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
| `deployment.privacy.whitelist` | CIDR whitelist for private ingress          | `0.0.0.0/0`   |

### Images

| Parameter                 | Description                           | Example                              |
| ------------------------- | ------------------------------------- | ------------------------------------ |
| `images.agent.repository` | Docker repository for the agent image | `io2060/2060-service-agent`          |
| `images.agent.tag`        | Agent Docker image tag                | `v1.2.0`                             |
| `images.invitationUrl`    | URL for invitation image              | `https://example.com/invitation.png` |

### Ports

| Parameter   | Description                              | Default |
| ----------- | ---------------------------------------- | ------- |
| `adminPort` | Port for admin interface                 | `3000`  |
| `agentPort` | Port for agent communication (`didcomm`) | `3001`  |

### PostgreSQL (Optional)

Enable PostgreSQL with credentials and persistence:

```yaml
postgresql:
  enabled: true
  auth:
    username: myuser
    password: mypassword
    database: mydatabase
  primary:
    persistence:
      enabled: true
      storageClass: csi-cinder-classic
      size: 1Gi
```

### Redis (Optional)

Enable Redis with connection details and persistence:

```yaml
redis:
  enabled: true
  host: your-redis-host
  password: myRedisPass123
  architecture: standalone
  auth:
    password: myRedisPass123
  persistence:
    enabled: true
    storageClass: csi-cinder-classic
    size: 1Gi
```

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

