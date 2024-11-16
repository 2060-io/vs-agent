# Nestjs-client

## How to use the connections?
```node 
// PostgreSQL
@Module({
  imports: [
    ConnectionsEventModule.register({
      useTypeOrm: true,
      database: {
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'user',
        password: 'password',
        database: 'my_db',
        schema: 'public',
        ssl: false,
        synchronize: true,
        logging: true
      }
    })
  ]
})
export class AppModule {}

// SQLite
@Module({
  imports: [
    ConnectionsEventModule.register({
      useTypeOrm: true,
      database: {
        type: 'sqlite',
        database: ':memory:' // o 'path/to/database.sqlite'
      }
    })
  ]
})
export class AppModule {}

// On memory
@Module({
  imports: [
    ConnectionsEventModule.register()
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
    }),
    // Handler for input messages
    MessageEventModule.register({
      messageHandler: {
        handleMessage: async (message) => {
          console.log('Received message:', message);
        }
      }
    })
  ],
})

```