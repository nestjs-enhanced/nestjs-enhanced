# Sockets

A nestjs module that allows messages to be pushed from anywhere within the application via socket.io. Requests/Sockets should have an identifier on them to allow for targeting them. It leverages `nestjs`

### Install:
`npm install @nestjs-enhanced/sockets @nestjs/platform-socket.io @nestjs/websockets socket.io`

### Usage:
**Register Module**

`main.ts`
```ts
import { initSocketAdapters } from '@nestjs-enhanced/sockets';

export const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);

  //...

  initSocketAdapters(
    app,
    // optional method to extract an identifier from the request
    (req) => extractUserIdFromRequest(req),
    // ...any other socket.io middlewares
  );
}
```

`app.module.ts`

*see [pub-sub](../pub-sub/)*

```ts
import { PubSubModule } from '@nestjs-enhanced/pub-sub';
import { SocketsModule } from '@nestjs-enhanced/sockets';

@Module({
  imports: [
    PubSubModule.registerPostgres({
      // pub-sub options
    }),
    SocketsModule,
  ]
})
```

`some-ui.ts`

*For actually connecting to the socket server*

`npm i socket.io-client`

```ts
import { Socket, io } from 'socket.io-client';

const url = ''; // path to the API running. If on the same domain, leave as an empty string
const socket = io(url);

// extracting `socketId`
socket.on('connected', () => {
  const socketId = socket.id;
})

socket.on('some-channel', () => {
  // handle message from the server
})
```

**Send message to socket**

```ts

import { SocketIOPropagatorService } from '@nestjs-enhanced/sockets';

@Injectable()
export class SomeService {
  constructor (
    private sockets: SocketIOPropagatorService
  ) { }

  async sendMessageToUser () {
    this.sockets.emitToUser({
      userId: 'userId',
      channel: 'some-channel',
      message: 'some message'
    });
  }


  async sendMessageToSocket () {
    this.sockets.emitToUser({
      targetSocketId: 'socketId', // derived from `socket.id` in the UI
      channel: 'some-channel',
      message: 'some message'
    });
  }
}
```

### Future:
- Method to test if a user is connected to a socket
- Support `ws` instead of `socket.io`
- Clean up the awful bootstrap process
