import { INestApplicationContext } from '@nestjs/common';
import { Request } from 'express';
import { Server, Socket } from 'socket.io';
import { SocketStateService } from './socket-state.service';
import { SocketAdapter } from './socket.adapter';
import { SocketIOPropagatorService } from './socket.propagator';

describe('SocketAdapter', () => {
  let app: INestApplicationContext;
  let socketStateService: SocketStateService;
  let propagatorService: SocketIOPropagatorService;
  let getUserIdFromRequest: (req: Request) => void|string|Promise<string|void>;
  let middlewares: any[];
  const socketWithUser = { id: '1', request: { userId: '1' }, on: jest.fn(), removeAllListeners: jest.fn() } as unknown as Socket;
  const next = jest.fn();
  const socketWithoutUser = { id: '1', request: { userId: '' }, on: jest.fn(), removeAllListeners: jest.fn() } as unknown as Socket;
  const port = 3000;
  const options = {} as any;

  let promises: any[] = [];

  function createAdapter () {
    const adapter = new SocketAdapter(app, socketStateService, propagatorService, getUserIdFromRequest, middlewares);
    const mockIOServer = {
      use: jest.fn().mockImplementation((middleware) => promises.push(middleware(socketWithUser, next))),
    };
    (adapter as any)['createIOServer'] = jest.fn().mockReturnValue(mockIOServer);

    return adapter;
  }

  beforeEach(async () => {
    promises = [];
    app = {} as INestApplicationContext;
    socketStateService = { connect: jest.fn(), disconnect: jest.fn() } as unknown as SocketStateService;
    propagatorService = { injectSocketServer: jest.fn().mockImplementation((req) => req.userId) } as unknown as SocketIOPropagatorService;
    getUserIdFromRequest = jest.fn().mockImplementation((req) => req.userId);
    middlewares = [jest.fn()];

    createAdapter();
  });

  afterEach(() => {
    jest.resetAllMocks();
  })

  it('should be defined', () => {
    const adapter = createAdapter();
    expect(adapter).toBeDefined();
  });

  it('should create a server', async () => {
    const adapter = createAdapter();
    const server = adapter.create(port, options) as unknown as Server;
    await Promise.all(promises);

    expect(server).toBeDefined();

    expect(server.use).toHaveBeenCalledTimes(middlewares.length + 1);
    middlewares.forEach(middleware => {
      expect(server.use).toHaveBeenCalledWith(middleware);
    });

    const middleware = (server.use as jest.Mock).mock.calls[middlewares.length][0];
    middleware(socketWithUser, next);

    expect(getUserIdFromRequest).toHaveBeenCalledWith(socketWithUser.request);
    expect(socketStateService.connect).toHaveBeenCalledWith(expect.anything(), socketWithUser);
    expect(socketWithUser.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(socketWithUser.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(next).toHaveBeenCalled();
  });

  it('should disconnect on error and disconnect events', async () => {
    const adapter = createAdapter();

    const server = adapter.create(port, options) as unknown as Server;
    await Promise.all(promises);

    const middleware = (server.use as jest.Mock).mock.calls[middlewares.length][0];

    middleware(socketWithUser, next);

    expect(socketWithUser.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(socketWithUser.on).toHaveBeenCalledWith('error', expect.any(Function));

    const disconnectHandler = (socketWithUser.on as jest.Mock).mock.calls[0][1];
    disconnectHandler();

    expect(socketStateService.disconnect).toHaveBeenCalledWith(expect.anything(), socketWithUser);

    const errorHandler = (socketWithUser.on as jest.Mock).mock.calls[1][1];
    errorHandler();

    expect(socketStateService.disconnect).toHaveBeenCalledWith(expect.anything(), socketWithUser);

    expect(socketWithUser.removeAllListeners).toHaveBeenCalledWith('disconnect');
  });

  it('should call next with an error if anything throws an error', async () => {
    socketStateService.connect = jest.fn().mockImplementation(() => { throw new Error('test'); });
    const adapter = createAdapter();

    const server = adapter.create(port, options) as unknown as Server;
    await Promise.all(promises);

    const middleware = (server.use as jest.Mock).mock.calls[middlewares.length][0];

    middleware(socketWithUser, next);

    expect(next).toHaveBeenCalledWith(new Error('test'));
  });

  it('should work without a user id on the request', async () => {
    const adapter = createAdapter();

    const server = adapter.create(port, options) as unknown as Server;
    await Promise.all(promises);

    const middleware = (server.use as jest.Mock).mock.calls[middlewares.length][0];

    middleware(socketWithoutUser, next);

    expect(socketStateService.connect).not.toHaveBeenCalledWith(expect.anything(), socketWithoutUser);
    expect(socketWithoutUser.on).not.toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(socketWithoutUser.on).not.toHaveBeenCalledWith('error', expect.any(Function));
    expect(next).toHaveBeenCalled();
  });
});