// FILEPATH: /Users/john.saady/Projects/Personal/nestjs-enhanced/packages/sockets/src/socket-state.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SocketStateService } from './socket-state.service';
import { Socket } from 'socket.io';

describe('SocketStateService', () => {
  let service: SocketStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SocketStateService],
    }).compile();

    service = module.get<SocketStateService>(SocketStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect a socket', () => {
    const socket = { id: '1' } as Socket;
    service.connect('1', socket);
    expect(service.getByUserId('1')).toEqual([socket]);
    expect(service.getBySocketId('1')).toEqual(socket);
    expect(service.getAll()).toEqual([socket]);
  });

  it('should disconnect a socket', () => {
    const socket = { id: '1' } as Socket;
    service.connect('1', socket);
    service.disconnect('1', socket);
    expect(service.getByUserId('1')).toEqual([]);
    expect(service.getBySocketId('1')).toBeUndefined();
    expect(service.getAll()).toEqual([]);
  });

  it('should handle multiple sockets for a user', () => {
    const socket1 = { id: '1' } as Socket;
    const socket2 = { id: '2' } as Socket;
    service.connect('1', socket1);
    service.connect('1', socket2);
    expect(service.getByUserId('1')).toEqual([socket1, socket2]);
    expect(service.getBySocketId('1')).toEqual(socket1);
    expect(service.getBySocketId('2')).toEqual(socket2);
    expect(service.getAll()).toEqual([socket1, socket2]);
  });
});