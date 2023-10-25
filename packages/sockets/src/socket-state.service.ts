import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class SocketStateService {
  private userSocketState = new Map<string, Socket[]>();
  private socketState = new Map<string, Socket>();

  disconnect (userId: string, socket: Socket): boolean {
    userId = '' + userId;
    const existingSockets = this.userSocketState.get(userId);

    if (!existingSockets) {
      return true;
    }

    const sockets = existingSockets.filter((s) => s.id !== socket.id);

    if (!sockets.length) {
      this.userSocketState.delete(userId);
    } else {
      this.userSocketState.set(userId, sockets);
    }

    this.socketState.delete(socket.id);

    return true;
  }

  connect (userId: string, socket: Socket): boolean {
    userId = '' + userId;

    const existingUserSockets = this.userSocketState.get(userId) || [];
    const sockets = [...existingUserSockets, socket];
    this.userSocketState.set(userId, sockets);

    this.socketState.set(socket.id, socket);

    return true;
  }

  getByUserId (userId: string): Socket[] {
    userId = '' + userId;

    return this.userSocketState.get('' + userId) || [];
  }

  getBySocketId (socketId: string): Socket | undefined {
    return this.socketState.get(socketId);
  }

  getAll (): Socket[] {
    return [...this.userSocketState.values()].flat();
  }
}
