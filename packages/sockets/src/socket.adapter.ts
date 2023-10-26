import { INestApplicationContext, Logger, WebSocketAdapter } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Request } from 'express';
import { Server, Socket } from 'socket.io';
import { SocketStateService } from './socket-state.service';
import { SocketIOPropagatorService } from './socket.propagator';

interface TokenPayload {
  readonly userId: string;
}

export interface AuthenticatedSocket extends Socket {
  auth: TokenPayload;
}

export class SocketAdapter extends IoAdapter implements WebSocketAdapter {
  private logger = new Logger('SocketAdapter');
  constructor(
    readonly app: INestApplicationContext,
    private readonly socketStateService: SocketStateService,
    private readonly propagatorService: SocketIOPropagatorService,
    private readonly getUserIdFromRequest: (req: Request) => void|string|Promise<string|void>,
    private middlewares: any[]
  ) {
    super(app);
  }

  create (port: number, options?: Parameters<IoAdapter['create']>[1]): Server {
    const server: Server = this.createIOServer(port, {
      ...options,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });
    this.propagatorService.injectSocketServer(server);

    this.middlewares.forEach(middleware => {
      server.use(middleware);
    });

    server.use(async (inboundSocket: Socket, next) => {
      const socket = inboundSocket as AuthenticatedSocket;
      const req = socket.request as any as Request;

      // TODO: support more generic method of extracting user info from request
      const userId = await this.getUserIdFromRequest(req);

      if (!userId) {
        // not authenticated connection is still valid
        // thus no error
        return next();
      }

      try {
        this.logger.log(`Connecting user ${userId}(${socket.id})`);
        this.socketStateService.connect(userId, socket);

        socket.on('disconnect', () => {
          this.logger.log(`Disconnecting user ${userId}(${socket.id})`);

          this.socketStateService.disconnect(userId, socket);

          socket.removeAllListeners('disconnect');
        });

        socket.on('error', () => {
          this.socketStateService.disconnect(userId, socket);

          socket.removeAllListeners('disconnect');
        });
        return next();
      } catch (e) {
        return next(e as any);
      }
    });

    return server;
  }
}
