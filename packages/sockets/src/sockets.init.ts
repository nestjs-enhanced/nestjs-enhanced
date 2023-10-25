import { INestApplication } from '@nestjs/common';

import { Request } from 'express';
import { SocketStateService } from './socket-state.service';
import { SocketAdapter } from './socket.adapter';
import { SocketIOPropagatorService } from './socket.propagator';

export const initSocketAdapters = (app: INestApplication, getUserIdFromRequest: (req: Request) => void|string|Promise<string|void> = () => {}, ...middlewares: any[]): INestApplication => {
  const socketStateService = app.get(SocketStateService);
  const socketPropagatorService = app.get(SocketIOPropagatorService);

  app.useWebSocketAdapter(new SocketAdapter(app, socketStateService, socketPropagatorService, getUserIdFromRequest, middlewares ?? []));

  return app;
};
