# Demo NestJS VS Chatbot - User Guide

The `nestjs-vs` directory contains a demonstration of a chatbot application built using VS Agent NestJS client. This guide provides an overview of the directory structure, setup instructions, and usage details.

---

## Directory Structure

```bash
nestjs-vs/
├── Dockerfile          # Docker configuration for building and running the chatbot
├── README.md           # Documentation for the nestjs-vs chatbot
├── src/                # Source code for the chatbot
│   ├── app.module.ts   # Main application module
│   ├── core.module.ts  # Core module for database and service integration
│   ├── core.service.ts # Core service handling business logic
│   ├── config/         # Configuration files
│   │   ├── app.config.ts
│   │   ├── logger.config.ts
│   │   └── index.ts
│   ├── models/         # Data models used in the application
│   │   └── index.ts
│   └── main.ts         # Entry point for the application
└── tsconfig.json       # TypeScript configuration
```

## Getting Started

This section provides a step-by-step guide to creating a chatbot using VS Agent NestJS client. The chatbot comes with default configurations that may not fit all use cases, so it is important to first define your requirements.

### **Key Considerations**

1. **Default Modules**:

   - The `messages` and `connections` modules are recommended to always be enabled and connected to a PostgreSQL database (or any database supported by TypeORM).
   - Modules like `credentials` or `statistics` are optional and should be added based on your specific needs. For more details, refer to the documentation of the [`nestjs-client`](../../packages/nestjs-client/README.md) library.

2. **Core Service**:

   - The `CoreService` is the central component of the chatbot. It provides various methods to handle messages, manage connections, and implement a state machine for structured chatbot logic.
   - While not all methods are mandatory, the recommended structure ensures a reliable state machine for handling user interactions.

3. **Enums for State Machine**:
   - The state machine steps and commands (e.g., contextual menu commands) are configured in enums. This is the recommended flow for managing user interactions.

---

### **Step 1: Install Dependencies**

Ensure all dependencies are installed by running the following command in the `nestjs-vs` directory:

```bash
pnpm install
```

---

### **Step 2: Configure the Application**

This step covers:

1. **Registering VS Agent events** via `EventsModule` in `app.module.ts`.
2. **Configuring CoreModule** for database and additional service modules.

---

#### 2.1 Register VS Agent Events in `app.module.ts`

Enable only the modules you need (`messages`, `connections`, `credentials`) and optionally the JMS `stats` module:

```typescript
import { Module } from '@nestjs/common'
import { EventsModule } from '@verana-labs/vs-agent-nestjs-client'
import { CoreService } from './core.service'

@Module({
  imports: [
    EventsModule.register({
      modules: {
        messages: true, // Required: handle chat messages
        connections: true, // Required: manage DIDComm connections
        credentials: true, // Optional: issue/verify credentials
        stats: true, // Optional: JMS stats via Rhea on port 5672
      },
      options: {
        url: process.env.VS_AGENT_ADMIN_URL, // VS Agent Admin API endpoint
        eventHandler: CoreService, // Service receiving incoming events
        imports: [
          // Other NestJS modules for DI
          // e.g., DatabaseModule, AuthModule
        ],
        statOptions: {
          // Stats config (only if stats enabled)
          host: process.env.VS_AGENT_STATS_HOST,
          port: Number(process.env.VS_AGENT_STATS_PORT) || 5672,
          queue: process.env.VS_AGENT_STATS_QUEUE,
          username: process.env.VS_AGENT_STATS_USER,
          password: process.env.VS_AGENT_STATS_PASSWORD,
          reconnectLimit: 10,
          threads: 2,
          delay: 1000,
        },
      },
    }),
    // ... other modules (e.g., CoreModule below)
  ],
  controllers: [],
  providers: [CoreService],
})
export class AppModule {}
```

**Note:** If you enable `stats`, ensure your JMS broker (e.g., ActiveMQ Artemis) accepts AMQP connections on port **5672** and configure the required environment variables.

---

#### 2.2 Configure Database & CoreModule in `core.module.ts`

Use `CoreModule` (or your application’s main module) to set up TypeORM and import required NestJS modules:

```typescript
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EventsModule } from '@verana-labs/vs-agent-nestjs-client'
import { CoreService } from './core.service'

@Module({
  imports: [
    // Database connection
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.POSTGRES_DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
    }),

    // VS Agent Events
    EventsModule.register({
      /* see above */
    }),

    // Other application modules
    // SomeOtherModule,
  ],
  providers: [CoreService],
})
export class CoreModule {}
```

---

### **Step 3: Implement the Core Service**

The `CoreService` provides the main logic for handling messages, managing connections, and implementing the state machine. Below is an overview of its key methods:

#### **Mandatory Methods**

1. **`onModuleInit` (optional)**:

   - Used to initialize global values, such as creating credential types.
   - Example:

     ```typescript
     async onModuleInit() {
       await this.credentialService.createType('demo dts', '1.0', ['fullName', 'issuanceDate'], {
         supportRevocation: true,
         maximumCredentialNumber: 5,
       });
     }
     ```

2. **`inputMessage` (mandatory)**:

   - Entry point for all incoming messages. Processes the message based on its type and routes it to the appropriate handler.
   - Example:

     ```typescript
     async inputMessage(message: BaseMessage): Promise<void> {
       switch (message.type) {
         case TextMessage.type:
           const content = JsonTransformer.fromJSON(message, TextMessage);
           await this.handleStateInput(content, session);
           break;
         // Handle other message types...
       }
     }
     ```

3. **`newConnection` (mandatory)**:

   - Triggered when a new connection is detected. Typically used to send a welcome message.
   - Example:

     ```typescript
     async newConnection(connectionId: string): Promise<void> {
       const session = await this.handleSession(connectionId);
       await this.sendContextualMenu(session);
     }
     ```

4. **`closeConnection` (mandatory)**:

   - Triggered when a connection is closed. Used to clean up user data.
   - Example:

     ```typescript
     async closeConnection(connectionId: string): Promise<void> {
       const session = await this.handleSession(connectionId);
       await this.purgeUserData(session);
     }
     ```

#### **Recommended Methods**

1. **`sendText`**:

   - Sends a text message to the user.
   - Example:

     ```typescript
     private async sendText(connectionId: string, text: string, lang: string) {
       await this.apiClient.messages.send(
         new TextMessage({
           connectionId,
           content: this.getText(text, lang),
         }),
       );
     }
     ```

2. **`getText`**:

   - Retrieves localized text for a given key and language.
   - Example:

     ```typescript
     private getText(text: string, lang: string): string {
       return this.i18n.t(`msg.${text}`, { lang });
     }
     ```

3. **`handleContextualAction`**:

   - Processes user selections from a contextual menu.
   - Example:

     ```typescript
     private async handleContextualAction(selectionId: string, session: SessionEntity): Promise<SessionEntity> {
       if (selectionId === Cmd.CREDENTIAL) {
         await this.credentialService.issue(session.connectionId, claims, { revokeIfAlreadyIssued: true });
       }
       return await this.sessionRepository.save(session);
     }
     ```

4. **`handleStateInput`**:

   - Centralizes state machine logic for processing messages.
   - Example:

     ```typescript
     private async handleStateInput(content: any, session: SessionEntity): Promise<SessionEntity> {
       switch (session.state) {
         case StateStep.START:
           session.state = StateStep.NEXT;
           break;
         // Handle other states...
       }
       return await this.sendContextualMenu(session);
     }
     ```

5. **`sendContextualMenu`**:

   - Sends a contextual menu to the user based on their current state.
   - Example:

     ```typescript
     private async sendContextualMenu(session: SessionEntity): Promise<SessionEntity> {
       const items = [
         new ContextualMenuItem({ id: Cmd.CREDENTIAL, title: this.getText('CMD.CREDENTIAL', session.lang) }),
         new ContextualMenuItem({ id: Cmd.REVOKE, title: this.getText('CMD.REVOKE', session.lang) }),
       ];
       await this.apiClient.messages.send(
         new ContextualMenuUpdateMessage({
           connectionId: session.connectionId,
           options: items,
           timestamp: new Date(),
         }),
       );
       return await this.sessionRepository.save(session);
     }
     ```

6. **`sendStats`** (optional):

- Defines statistic keys for `sendStats`.

  Example:

  ```typescript
  // src/common/stat-kpi.enum.ts
  export enum STAT_KPI {
    USER_CONNECTED = 'USER_CONNECTED',
    USER_DISCONNECTED = 'USER_DISCONNECTED',
    MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
    CREDENTIAL_ISSUED = 'CREDENTIAL_ISSUED',
    // extend as needed
  }
  ```

- Emits runtime metrics to a JMS queue via the injected `statProducer`.

  Example:

  ```typescript
  import { STAT_KPI } from './common';
  import { StatEnum } from '@2060.io/service-agent-model';

  private async sendStats(kpi: STAT_KPI, session: SessionEntity): Promise<void> {
    this.logger.debug('*** Sending stats event ***');
    const payload = [STAT_KPI[kpi]];
    if (session) {
      await this.statProducer.spool(
        payload,
        session.connectionId,
        [new StatEnum(0, STAT_KPI[kpi].toString())],
      );
    }
  }
  ```

- ``: a value from the `STAT_KPI`enum (e.g.,`STAT_KPI.USER_CONNECTED`).
- ``: your `SessionEntity`, used to tie stats to a connection.

These events are published to your JMS broker and can be consumed by downstream analytics or monitoring pipelines.

---

### **Step 4: Run the Chatbot**

1. Compile the TypeScript code:

   ```bash
   pnpm build
   ```

2. Start the chatbot:

   ```bash
   pnpm start
   ```

---

### **Next Steps**

- Extend the chatbot by adding custom commands and states in the enums.
- Integrate additional modules like `credentials` or `statistics` if needed.
- Customize the state machine logic in `handleStateInput` to fit your use case.

By following these steps, you can quickly set up a functional chatbot and start building on top of the provided framework.

---

### **Setup Process**

1. **Environment Variables**:

   - Ensure all required variables (e.g., `VS_AGENT_ADMIN_URL`, `DATABASE_HOST`) are set.

2. **Database Configuration**:

   - Use `TypeOrmModule` to connect to a PostgreSQL database.
   - Define entities like `SessionEntity` for session management.

3. **Internationalization**:

   - Configure `I18nModule` with translation files for supported languages.
   - Use `i18n.t()` in the `CoreService` to retrieve localized text.

4. **VS Agent Integration**:
   - Use `ApiClient` to send messages and interact with VS Agent Admin API.
   - Use `CredentialService` to issue and revoke credentials.

---

### **Modules and Their Functions**

- **`CoreService`**:

  - Manages chatbot logic, including message handling, session management, and API interactions.

- **`SessionEntity`**:

  - Represents a session in the database, storing connection details and state.

- **`CredentialService`**:

  - Handles credential issuance and revocation.

- **`ApiClient`**:

  - Sends messages (e.g., text, contextual menus) to VS Agent Admin API.

- **`I18nService`**:
  - Provides localized text for multilingual support.

---

### **Library Documentation**

- **`@verana-labs/vs-agent-model`**:

  - Defines message models (e.g., `TextMessage`, `ContextualMenuItem`) for communication.

- **`@verana-labs/vs-agent-client`**:

  - Provides the `ApiClient` for interacting with VS Agent Admin API.

- **`@verana-labs/vs-agent-nestjs-client`**:

  - Offers utilities like `CredentialService` for managing credentials.

- **`nestjs-i18n`**:

  - Handles internationalization with support for multiple languages.

- **`typeorm`**:
  - Manages database interactions, including session persistence.

---

## Prerequisites

Before running the chatbot, ensure you have the following installed:

- Node.js (v20 or higher)
- Yarn package manager
- Docker (optional, for containerized deployment)

---

## Setup Instructions

Follow these steps to run the `nestjs-vs` chatbot example from this repository:

### 1. **Clone the Repository**

```bash
git clone https://github.com/2060-io/vs-agent.git
cd vs-agent/examples/nestjs-vs
```

### 2. **Install Dependencies**

Install all project dependencies:

```bash
pnpm install
```

### 3. **Configure Environment Variables**

Create a `.env` file in the root of the `nestjs-vs` directory or export variables in your shell. These are the required variables (adjust values as needed):

| Variable             | Description              | Default/Example     |
| -------------------- | ------------------------ | ------------------- |
| `VS_AGENT_ADMIN_URL` | VS Agent Admin API URL   | `http://agent:3000` |
| `DATABASE_HOST`      | PostgreSQL database host | `localhost`         |
| `DATABASE_PORT`      | PostgreSQL database port | `5432`              |
| `DATABASE_USER`      | Database username        | `user`              |
| `DATABASE_PASSWORD`  | Database password        | `password`          |
| `POSTGRES_DB_NAME`   | Database name            | `demo`              |

#### _(Optional)_ JMS Statistics Integration

If you plan to enable the statistics module via JMS (ActiveMQ/Artemis), also set:

| Variable                  | Description                                   | Default/Example |
| ------------------------- | --------------------------------------------- | --------------- |
| `VS_AGENT_STATS_ENABLED`  | Enable JMS stats integration (`true`/`false`) | `false`         |
| `VS_AGENT_STATS_HOST`     | JMS broker host (e.g., Artemis)               | `localhost`     |
| `VS_AGENT_STATS_PORT`     | JMS broker AMQP port                          | `5672`          |
| `VS_AGENT_STATS_QUEUE`    | Queue name for published stats                | `stats.queue`   |
| `VS_AGENT_STATS_USER`     | JMS username                                  | `artemis`       |
| `VS_AGENT_STATS_PASSWORD` | JMS password                                  | `artemis`       |

> 💡 **Tip:** You can copy and rename `.env.example` if available.

### 4. **Build the Application**

Compile TypeScript to JavaScript:

```bash
pnpm build
```

### 5. **Run the Application Locally**

```bash
pnpm start
```

The API (Swagger UI) will be available at [`http://localhost:3000/api`](http://localhost:3000/api).

---

## Running with Docker

To run the chatbot in a Docker container:

1. **Build the Docker Image**:

   ```bash
   docker build -t nestjs-vs-chatbot .
   ```

2. **Run the Container**:

   ```bash
   docker run -p 3000:3000 -e VS_AGENT_ADMIN_URL=<url> nestjs-vs-chatbot
   ```

---

## Features

- **Multilingual Support**:
  The chatbot supports multiple languages using the `nestjs-i18n` library. Configure the fallback language in `src/app.module.ts`.

- **Database Integration**:
  The chatbot uses PostgreSQL for session management and other data storage. Configuration is handled in `src/core.module.ts`.

- **Event Handling**:
  The chatbot processes incoming messages and routes them to appropriate handlers in `src/core.service.ts`.

- **Swagger API Documentation**:
  The application provides API documentation at `/api` when running locally.

---

## Development Notes

- **Logging**:
  Customize logging levels in `src/config/logger.config.ts`.

- **Custom Modules**:
  Add new modules or services by extending the `src/app.module.ts` file.

- **Testing**:
  Run tests using:

  ```bash
  yarn test
  ```

  > 💡 **Note:** For local development, consider replacing the `@2060.io` library versions such as:
  >
  > ```json
  > "@verana-labs/vs-agent-model": "workspace:*",
  > "@verana-labs/vs-agent-nestjs-client": "workspace:*",
  > "@verana-labs/vs-agent-client": "workspace:*"
  > ```
  >
  > This allows you to work more easily with local packages during development.

---

## Troubleshooting

- **Database Connection Issues**:
  Ensure the database credentials in the environment variables are correct.

- **Application Fails to Start**:
  Check the logs for errors and ensure all dependencies are installed.

- **Swagger Documentation Not Accessible**:
  Verify the application is running and navigate to `/api` in your browser.

---

## **Recommendations**

1. **Focus on Core Components**:

   - The `app.module.ts`, `core.service.ts`, and `core.module.ts` files are the main focus of this application. These files define the structure and behavior of the chatbot. If you plan to create a new chatbot, start by reviewing and adapting these files to meet your requirements.

2. **Leverage Modular Design**:

   - The library is designed to be modular, allowing you to extend or replace components as needed. Use the modular structure to add new features or customize existing ones without disrupting the core functionality.

3. **Session Management**:

   - Use the `models` directory to define and manage session entities. This ensures a consistent and reliable way to handle user sessions across the application.

4. **Standardize Commands**:

   - The `commands` file is essential for maintaining a standard across the development process. Define all chatbot commands here to ensure consistency and avoid duplication.

5. **Review Library Documentation**:

   - Familiarize yourself with the APIs provided by the `@2060.io` libraries. These libraries offer powerful tools for message handling, credential management, and API interactions.

6. **Extend Features**:

   - Add support for additional message types, commands, or contextual menu actions as needed. The modular design makes it easy to extend the chatbot's functionality.

7. **Testing and Debugging**:

   - Write unit tests for critical methods in `core.service.ts` to ensure reliability.
   - Use detailed logging to track message processing, session updates, and API interactions.

8. **Error Handling**:

   - Implement robust error handling in methods like `inputMessage` and `handleStateInput` to ensure the chatbot can recover gracefully from unexpected issues.

9. **Follow Best Practices**:
   - Maintain a clean and organized codebase by adhering to best practices for modular development.
   - Use consistent naming conventions and document your code to make it easier for others to understand and contribute.

By following these recommendations, you can build a scalable, maintainable, and feature-rich chatbot application.
