import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Subject } from 'rxjs';
import { SocketStateService } from './socket-state.service';
import { SocketAdapter } from './socket.adapter';
import { SocketIOPropagatorService } from './socket.propagator';
import { initSocketAdapters } from './sockets.init';

describe('initSocketAdapters', () => {
  let app: INestApplication;
  let socketStateService: SocketStateService;
  let socketPropagatorService: SocketIOPropagatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketStateService,
        SocketIOPropagatorService,
        {
          provide: 'PUB_SUB_PROVIDER',
          useValue: {
            subscribe: jest.fn().mockReturnValue(new Subject()),
          }
        }
      ],
    }).compile();

    app = {
      get: jest.fn().mockImplementation((type: any) => module.get(type)),
      useWebSocketAdapter: jest.fn(),
    } as any;

    socketStateService = module.get<SocketStateService>(SocketStateService);
    socketPropagatorService = module.get<SocketIOPropagatorService>(SocketIOPropagatorService);
  });

  it('should initialize socket adapters with default middleware', () => {
    const getUserIdFromRequest = jest.fn();
    initSocketAdapters(app, getUserIdFromRequest);

    expect(app.useWebSocketAdapter).toHaveBeenCalledTimes(1);
    expect(app.useWebSocketAdapter).toHaveBeenCalledWith(expect.any(SocketAdapter));

    const socketAdapter = (app.useWebSocketAdapter as jest.Mock).mock.calls[0][0] as SocketAdapter;
    expect(socketAdapter).toBeInstanceOf(SocketAdapter);
    expect(socketAdapter.app).toBe(app);
    expect(socketAdapter['socketStateService']).toBe(socketStateService);
    expect(socketAdapter['propagatorService']).toBe(socketPropagatorService);
    expect(socketAdapter['getUserIdFromRequest']).toBe(getUserIdFromRequest);
    expect(socketAdapter['middlewares']).toEqual([]);
  });

  it('should initialize socket adapters without request id', () => {
    const getUserIdFromRequest = jest.fn();
    initSocketAdapters(app);

    expect(app.useWebSocketAdapter).toHaveBeenCalledTimes(1);
    expect(app.useWebSocketAdapter).toHaveBeenCalledWith(expect.any(SocketAdapter));

    const socketAdapter = (app.useWebSocketAdapter as jest.Mock).mock.calls[0][0] as SocketAdapter;
    expect(socketAdapter).toBeInstanceOf(SocketAdapter);
    expect(socketAdapter.app).toBe(app);
    expect(socketAdapter['socketStateService']).toBe(socketStateService);
    expect(socketAdapter['propagatorService']).toBe(socketPropagatorService);
    expect(socketAdapter['middlewares']).toEqual([]);
  });

  it('should initialize socket adapters with custom middleware', () => {
    const getUserIdFromRequest = jest.fn();
    const middleware1 = jest.fn();
    const middleware2 = jest.fn();
    initSocketAdapters(app, getUserIdFromRequest, middleware1, middleware2);

    expect(app.useWebSocketAdapter).toHaveBeenCalledTimes(1);
    expect(app.useWebSocketAdapter).toHaveBeenCalledWith(expect.any(SocketAdapter));

    const socketAdapter = (app.useWebSocketAdapter as jest.Mock).mock.calls[0][0] as SocketAdapter;
    expect(socketAdapter).toBeInstanceOf(SocketAdapter);
    expect(socketAdapter.app).toBe(app);
    expect(socketAdapter['socketStateService']).toBe(socketStateService);
    expect(socketAdapter['propagatorService']).toBe(socketPropagatorService);
    expect(socketAdapter['getUserIdFromRequest']).toBe(getUserIdFromRequest);
    expect(socketAdapter['middlewares']).toEqual([middleware1, middleware2]);
  });
});