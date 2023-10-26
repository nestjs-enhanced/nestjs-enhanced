import { InjectPubSub, PubSubService } from '@nestjs-enhanced/pub-sub';
import { Injectable, Logger } from '@nestjs/common';
import { Subject, firstValueFrom, of, race } from 'rxjs';
import { delay, filter, map, tap } from 'rxjs/operators';
import { Server } from 'socket.io';
import { v4 } from 'uuid';
import { SocketStateService } from './socket-state.service';

export const SOCKET_EVENT_ALL_AUTHENTICATED = 'SOCKET_EVENT_ALL_AUTHENTICATED';
export const SOCKET_EVENT_PEERS = 'SOCKET_EVENT_PEERS';
export const SOCKET_EVENT_SOCKET = 'SOCKET_EVENT_SOCKET';
export const SOCKET_EVENT_USER = 'SOCKET_EVENT_USER';
export const messageEmittedChannel = 'message:emitted';


export interface SocketMessage {
  message: string;
  channel: string;
}

export interface UserSocketPropagationMessage extends SocketMessage {
  /**
   * Target user id to send message to
   */
  userId: string;

  /**
   * Socket to exclude
   */
  originSocketId?: string;
}

export interface SpecificSocketPropagationMessage extends SocketMessage {
  /**
   * Target socket id to send message to
   */
  targetSocketId: string;
}

export interface WrappedMessage<T extends SocketMessage> {
  id: string;
  message: T;
}

@Injectable()
export class SocketIOPropagatorService {
  private waitTimeout = 10000;
  private socketServer!: Server;
  private peerMessages$ = new Subject<SocketMessage>();

  logger = new Logger('SocketPropagatorService');

  constructor(private readonly socketStateService: SocketStateService, @InjectPubSub() private readonly pubSubService: PubSubService<any>) {
    this.pubSubService.subscribe(SOCKET_EVENT_USER).pipe(tap(this.consumeToUserSendEvent)).subscribe();

    this.pubSubService.subscribe(SOCKET_EVENT_SOCKET).pipe(tap(this.consumeToSocketSendEvent)).subscribe();

    this.pubSubService.subscribe(SOCKET_EVENT_ALL_AUTHENTICATED).pipe(tap(this.consumeToAuthenticatedEvent)).subscribe();

    this.pubSubService.subscribe(SOCKET_EVENT_PEERS).pipe(tap(this.consumeFromPeersEvent)).subscribe();
  }

  injectSocketServer (server: Server): SocketIOPropagatorService {
    this.socketServer = server;

    return this;
  }

  async emitToSocket (eventInfo: SpecificSocketPropagationMessage): Promise<boolean> {
    const messageId = await this.publish(SOCKET_EVENT_SOCKET, eventInfo);
    const sent = await this.waitForPeerMessage(messageEmittedChannel, messageId);

    return sent;
  }

  private consumeToSocketSendEvent = async (eventInfo: WrappedMessage<SpecificSocketPropagationMessage>) => {
    const { channel, message, targetSocketId } = eventInfo.message;

    const socket = this.socketStateService.getBySocketId(targetSocketId ?? '');

    if (socket) {
      const sent = socket.emit(channel, message);

      this.logger[sent ? 'log' : 'warn'](`${sent ? 'Successfully' : 'Unsuccessfully'} sent message: ${eventInfo.id}`);
      
      if (sent) {
        await this.publish(SOCKET_EVENT_PEERS, {
          message: eventInfo.id,
          channel: messageEmittedChannel
        });
      }
    } else {
      this.logger.warn(`Skipping ${eventInfo.id}`);
    }
  };

  async emitToUser (eventInfo: UserSocketPropagationMessage): Promise<boolean> {
    if (!eventInfo.userId) {
      return false;
    }
    
    const messageId = await this.publish(SOCKET_EVENT_USER, eventInfo);

    const sent = await this.waitForPeerMessage(messageEmittedChannel, messageId);

    return sent;
  }

  private consumeToUserSendEvent = async (eventInfo: WrappedMessage<UserSocketPropagationMessage>) => {
    const { userId, channel, message, originSocketId } = eventInfo.message;

    const sockets = this.socketStateService.getByUserId(userId).filter((socket) => socket.id !== originSocketId);

    this.logger.log(`Found ${sockets.length} sockets for user ${userId}`);

    const emitted = sockets.reduce((acc, socket) => socket.emit(channel, message) && acc, true);

    if (sockets.length > 0 && emitted) {
      await this.publish(SOCKET_EVENT_PEERS, {
        message: eventInfo.id,
        channel: messageEmittedChannel
      });
    }
  };

  async emitToAuthenticated (eventInfo: SocketMessage): Promise<boolean> {
    await this.publish(SOCKET_EVENT_ALL_AUTHENTICATED, eventInfo);

    return true;
  }

  private consumeToAuthenticatedEvent = (eventInfo: WrappedMessage<SocketMessage>) => {
    const { channel, message } = eventInfo.message;

    return this.socketStateService.getAll().forEach((socket) => socket.emit(channel, message));
  };

  private consumeFromPeersEvent = (eventInfo: WrappedMessage<SocketMessage>) => {
    const { channel, message } = eventInfo.message;

    this.peerMessages$.next({ channel, message });
  };

  private async publish<T extends SocketMessage> (topic: string, eventInfo: T) {
    const id = v4();
    await this.pubSubService.publish(topic, {
      id,
      message: eventInfo
    });

    return id;
  }

  waitForPeerMessage (channel: string, message?: any): Promise<boolean> {
    return firstValueFrom(
      race(
        this.peerMessages$.pipe(
          filter((inboundMessage) => {
            return inboundMessage.channel === channel && (!message || message === inboundMessage.message)
          }),
        ).pipe(
          map(() => true),
        ),
        of(null)
          .pipe(delay(this.waitTimeout))
          .pipe(map(() => false)),
      ),
    );
  }
}
