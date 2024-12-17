# Nestjs-client

## How to use the connections?
```node 
@Module({
  imports: [
    ConnectionsEventModule.forRoot({
      messageHandler: CustomMessageHandler, // Class with input method
      imports: []
    })
  ]
})
export class AppModule {}
```


## How to use messages
```node
@Module({
  imports: [
    MessageEventModule.forRoot({
      messageHandler: CustomMessageHandler, // Class with input method
      imports: []
      url: 'http://sa-url.com',
      version: ApiVersion.V1,
    }),
  ],
})

```