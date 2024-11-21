# Nestjs-client

## How to use the connections?
```node 
@Module({
  imports: [
    ConnectionsEventModule.register({
      messageHandler: CustomMessageHandler, // Class with input method
      imports: [TypeOrmConfig]
    })
  ]
})
export class AppModule {}
```


## How to use messages
```node
@Module({
  imports: [
    MessageEventModule.register({
      messageHandler: CustomMessageHandler, // Class with input method
      imports: [TypeOrmConfig]
      url: 'http://sa-url.com',
      version: ApiVersion.V1,
    }),
  ],
})

```