# Nestjs-client for Service Agent
The `nestjs-client` library is designed to manage recurring components for chatbots developed using the [2060 Service Agent](../../README.md). Its modules follow a plug-and-play architecture, allowing developers to include them as needed. However, certain modules, such as credential management, recommend incorporating the message handling module to function correctly.

**Example of Using Independent Modules:**

```typescript
@Module({
  imports: [
    MessageEventModule.forRoot({
      messageHandler: CustomMessageHandler, // Class with input method
      imports: [],
      url: 'http://sa-url.com',
      version: ApiVersion.V1,
    }),
    CredentialManagementModule.forRoot({
      // Configuration options
    }),
  ],
})
export class AppModule {}
```

**Example of Using the Recommended `EventsModule`:**

```typescript
@Module({
  imports: [
    EventsModule.register({
      modules: {
        messages: true,
        credentials: true,
      },
      options: {
        eventHandler: CoreService,
        imports: [],
        url: process.env.SERVICE_AGENT_ADMIN_URL,
        version: ApiVersion.V1,
      },
    }),
  ],
})
export class AppModule {}
```

In the first example, individual modules like `MessageEventModule` and `CredentialManagementModule` are configured separately. In the second example, the `EventsModule` is used to register multiple modules simultaneously, which is the recommended approach for streamlined configuration and better integration.

For more information on dynamic modules and their configuration in NestJS, refer to the official [documentation](https://docs.nestjs.com/fundamentals/dynamic-modules)