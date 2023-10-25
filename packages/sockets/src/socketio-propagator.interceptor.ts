import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { WsResponse } from '@nestjs/websockets';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AuthenticatedSocket } from './socket.adapter';

import { Reflector } from '@nestjs/core';
import { SocketIOPropagatorService } from './socket.propagator';

@Injectable()
export class SocketIOPropagatorInterceptor<T> implements NestInterceptor<T, WsResponse<T>> {
  public constructor(private readonly socketIOPropagatorService: SocketIOPropagatorService, private reflector: Reflector) { }

  public intercept (context: ExecutionContext, next: CallHandler): Observable<WsResponse<T>> {
    const wsClient = context.switchToWs();
    const socket: AuthenticatedSocket = wsClient.getClient();

    // TODO: point the key below to the nest library
    const messageName = this.reflector.get<string>('message', context.getHandler()) ?? this.reflector.get<string>('message', context.getClass());

    // notify peers of new inbound message
    this.socketIOPropagatorService.emitToUser({
      channel: messageName,
      message: wsClient.getData(),
      originSocketId: socket.id,
      userId: socket.auth?.userId,
    });

    return next.handle().pipe(
      tap((data) => {
        // notify peers of new outbound message
        this.socketIOPropagatorService.emitToSocket({
          channel: messageName,
          message: (data.data ?? data) as any,
          targetSocketId: socket.id,
        });
      }),
    );
  }
}
