# Demo DTS Chatbot - User Guide

The `demo-dts` directory contains a demonstration of a chatbot application built using the 2060 Service Agent framework. This guide provides an overview of the directory structure, setup instructions, and usage details.

---

## Directory Structure

The `demo-dts` directory is organized as follows:

```
demo-dts/
├── Dockerfile          # Docker configuration for building and running the chatbot
├── README.md           # Documentation for the demo-dts chatbot
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
This section provides a step-by-step guide to creating a chatbot using the 2060 Service Agent framework. The chatbot comes with default configurations that may not fit all use cases, so it is important to first define your requirements. 

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

Ensure all dependencies are installed by running the following command in the `demo-dts` directory:

```bash
pnpm install
```

---

### **Step 2: Configure the Application**

Edit the `src/app.module.ts` and `src/core.module.ts` files to configure the database connection and enable the required modules (`messages`, `connections`, etc.). For example:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreModule } from './core.module';

@Module({
  imports: [
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
    CoreModule,
  ],
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
   - Ensure all required variables (e.g., `SERVICE_AGENT_ADMIN_URL`, `DATABASE_HOST`) are set.

2. **Database Configuration**:
   - Use `TypeOrmModule` to connect to a PostgreSQL database.
   - Define entities like `SessionEntity` for session management.

3. **Internationalization**:
   - Configure `I18nModule` with translation files for supported languages.
   - Use `i18n.t()` in the `CoreService` to retrieve localized text.

4. **Service Agent Integration**:
   - Use `ApiClient` to send messages and interact with the Service Agent Admin API.
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
  - Sends messages (e.g., text, contextual menus) to the Service Agent Admin API.

- **`I18nService`**:
  - Provides localized text for multilingual support.

---

### **Library Documentation**
- **`@2060.io/service-agent-model`**:
  - Defines message models (e.g., `TextMessage`, `ContextualMenuItem`) for communication.

- **`@2060.io/service-agent-client`**:
  - Provides the `ApiClient` for interacting with the Service Agent Admin API.

- **`@2060.io/service-agent-nestjs-client`**:
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

1. **Install Dependencies**:
   Navigate to the `demo-dts` directory and install the required dependencies:
   ```bash
   yarn install
   ```

2. **Build the Application**:
   Compile the TypeScript code:
   ```bash
   yarn build
   ```

3. **Run the Application**:
   Start the chatbot application:
   ```bash
   yarn start
   ```

4. **Environment Variables**:
   Ensure the following environment variables are set:
   - `SERVICE_AGENT_ADMIN_URL`: URL of the Service Agent Admin API.
   - `DATABASE_HOST`: Hostname of the PostgreSQL database.
   - `DATABASE_USER`: Username for the database.
   - `DATABASE_PASSWORD`: Password for the database.
   - `POSTGRES_DB_NAME`: Name of the database.
   - `PUBLIC_BASE_URL`: The publicly accessible base URL of the service (`e.g., https://my-service.example.com`).

---

## Running with Docker

To run the chatbot in a Docker container:

1. **Build the Docker Image**:
   ```bash
   docker build -t demo-dts-chatbot .
   ```

2. **Run the Container**:
   ```bash
   docker run -p 3000:3000 -e SERVICE_AGENT_ADMIN_URL=<url> demo-dts-chatbot
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
