# nestjs-enhanced

This repository contains several packages that enhance the functionality of NestJS:

- [@nestjs-enhanced/context](./packages/context): Provides access to the current express request from anywhere.
- [@nestjs-enhanced/pg-boss](./packages/pg-boss/): Decorators that provide a more 'nest' way of scheduling work with [pg-boss](https://github.com/timgit/pg-boss)
- [@nestjs-enhanced/pub-sub](./packages/pub-sub/): Lightweight mechanism to send/receive messages between different nestjs services. Currently only supports postgres
- [@nestjs-enhanced/sockets](./packages/sockets/): Provides easy access to active sockets from anywhere
- [@nestjs-enhanced/workers](./packages/workers/): Spawn child threads/processes within nestjs
