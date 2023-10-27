# Context

A basic nestjs module for providing access to the current request through dependency injection (without using the REQUEST-scoped provider). Currently only applicable to `express` requests.

### Install:
`npm install @nestjs-enhanced/context`

### Usage:
**Register Module**
```ts
import { ContextModule } from '@nestjs-enhanced/context';

@Module({
  imports: [
    ContextModule
  ],
  // ...
})
export class AppModule {
  // ...
}
```

**Access current request**
```ts
import { RequestContextService } from '@nestjs-enhanced/context';

@Injectable()
export class MyService {
  constructor (
    private requestCtx: RequestContextService
  ) { }

  doSomeWork () {
    const request = this.requestCtx.getContext(); // returns the current express request
  }
}
```

### Future:
- Access current `job` from `@nestjs-enhanced/pg-boss`
- Support different contexts
  - fastify
  - microservices
  - websockets
  - cli?
