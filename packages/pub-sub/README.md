# Pub-Sub

A nestjs module for broadcasting/subscribing to events between different services. Currently only `postgres` is supported.

### Install:
`npm install @nestjs-enhanced/pub-sub pg`

### Usage:
**Register Module (postgres)**
```ts
import { PubSubModule } from '@nestjs-enhanced/pub-sub';

@Module({
  imports: [
    PubSubModule.registerPostgresAsync({
      useFactory: (config) => ({
        connectionString: config.getOrThrow('DATABASE_URL'),
        password: config.getOrThrow('DATABASE_PASSWORD'),
        // other `pg` options
      }),
      inject: [ConfigService],
      imports: [NestConfigModule]
    }),

    // or

    PubSubModule.registerPostgres({{
      connectionString: 'DATABASE_URL',
      password: 'DATABASE_PASSWORD',
      // other `pg` options
    }),
  ]
  //...
})
export class AppModule { }
```

**Send/Receive message**
```ts
//...
import { InjectPubSub, PubSubService } from '@nestjs-enhanced/pub-sub';

@Injectable()
export class MyService {
  constructor (
    @InjectPubSub() private readonly pubSubService: PubSubService<any>
  ) { }


  sendMessage () {
    this.pubSubService.publish('some-topic', {
      some: 'data'
    });
  }

  receiveMessage () {
    this.pubSubService.subscribe('some-topic')
      .subscribe((message) => {
        message; // is the payload from above { "some": "data" }
      });
  }
}
```

### Future
- Add decorators
- Add lightweight routing (wildcards/namespaces)
- Clean up delivery verification
- Make postgres registration a separate npm entrypoint
- Support nestjs/events for local pubsub
- Support redis
- Support rabbitmq, kafka, mqtt
