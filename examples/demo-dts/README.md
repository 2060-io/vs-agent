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
### **Core Service Overview**
The `CoreService` class is the central component of the chatbot application. It handles incoming messages, manages sessions, and interacts with external services using the `2060.io/service-agent-client` and `2060.io/service-agent-model` libraries.

### **App Module Overview**
The `app.module.ts` file is the entry point for the application and defines the modules, services, and configurations required for the chatbot. Here's a breakdown of its components:

#### **1. Imports**
- **`ConfigModule`**: Loads environment variables and configuration files.
- **`TypeOrmModule`**: Configures the database connection and entities (e.g., `SessionEntity`).
- **`I18nModule`**: Sets up internationalization for multilingual support.
- **`EventsModule`**: Provides the `CredentialService` and other utilities for interacting with the Service Agent framework.

#### **2. Providers**
- **`CoreService`**: The main service for handling chatbot logic.
- **Other Services**: Additional services can be added here for extended functionality.

#### **3. Configuration**
- **Database**: Configured using `TypeOrmModule.forRoot()` with connection details (e.g., host, username, password).
- **Internationalization**: Configured with fallback languages and translation files.

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
