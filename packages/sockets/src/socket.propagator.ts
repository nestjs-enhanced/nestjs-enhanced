import { InjectPubSub, PubSubService } from '@nestjs-enhanced/pub-sub';
import { Injectable, Logger } from '@nestjs/common';
import { Subject, firstValueFrom, of, race } from 'rxjs';
import { delay, filter, map, tap } from 'rxjs/operators';
import { Server } from 'socket.io';
import { v4 } from 'uuid';
import { SocketStateService } from './socket-state.service';

const SOCKET_EVENT_ALL_AUTHENTICATED = 'SOCKET_EVENT_ALL_AUTHENTICATED';
const SOCKET_EVENT_ALL = 'SOCKET_EVENT_ALL';
const SOCKET_EVENT_PEERS = 'SOCKET_EVENT_PEERS';
const SOCKET_EVENT_SOCKET = 'SOCKET_EVENT_SOCKET';
const SOCKET_EVENT_USER = 'SOCKET_EVENT_USER';

const messageEmittedChannel = 'message:emitted';


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

interface WrappedMessage<T extends SocketMessage> {
  id: string;
  message: T;
}

export interface IPropagatorService {
  emitToSocket (eventInfo: SpecificSocketPropagationMessage): Promise<boolean>;
  emitToUser (eventInfo: UserSocketPropagationMessage): Promise<boolean>;
  emitToAuthenticated (eventInfo: SocketMessage): Promise<boolean>;
  emitToAll (eventInfo: SocketMessage): Promise<boolean>;
}

@Injectable()
export class SocketIOPropagatorService implements IPropagatorService {
  private socketServer!: Server;
  private peerMessages$ = new Subject<SocketMessage>();

  logger = new Logger('SocketPropagatorService');

  constructor(private readonly socketStateService: SocketStateService, @InjectPubSub() private readonly pubSubService: PubSubService<any>) {
    this.pubSubService.subscribe(SOCKET_EVENT_USER).pipe(tap(this.consumeToUserSendEvent)).subscribe();

    this.pubSubService.subscribe(SOCKET_EVENT_SOCKET).pipe(tap(this.consumeToSocketSendEvent)).subscribe();

    this.pubSubService.subscribe(SOCKET_EVENT_ALL).pipe(tap(this.consumeToAllEvent)).subscribe();

    this.pubSubService.subscribe(SOCKET_EVENT_ALL_AUTHENTICATED).pipe(tap(this.consumeToAuthenticatedEvent)).subscribe();

    this.pubSubService.subscribe(SOCKET_EVENT_PEERS).pipe(tap(this.consumeFromPeersEvent)).subscribe();
  }

  injectSocketServer (server: Server): SocketIOPropagatorService {
    this.socketServer = server;

    return this;
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

  private consumeToAllEvent = (eventInfo: WrappedMessage<SocketMessage>) => {
    const { channel, message } = eventInfo.message;

    this.socketServer.emit(channel, message);
  };

  private consumeToAuthenticatedEvent = (eventInfo: WrappedMessage<SocketMessage>) => {
    const { channel, message } = eventInfo.message;

    return this.socketStateService.getAll().forEach((socket) => socket.emit(channel, message));
  };

  private consumeFromPeersEvent = (eventInfo: WrappedMessage<SocketMessage>) => {
    const { channel, message } = eventInfo.message;

    this.peerMessages$.next({ channel, message });
  };

  async emitToSocket (eventInfo: SpecificSocketPropagationMessage): Promise<boolean> {
    await this.publish(SOCKET_EVENT_SOCKET, eventInfo);

    return true;
  }

  async emitToUser (eventInfo: UserSocketPropagationMessage): Promise<boolean> {
    if (!eventInfo.userId) {
      return false;
    }
    
    const messageId = await this.publish(SOCKET_EVENT_USER, eventInfo);

    const sent = await this.waitForPeerMessage(messageEmittedChannel, messageId);

    return sent;
  }

  async emitToAuthenticated (eventInfo: SocketMessage): Promise<boolean> {
    await this.publish(SOCKET_EVENT_ALL_AUTHENTICATED, eventInfo);

    return true;
  }

  async emitToAll (eventInfo: SocketMessage): Promise<boolean> {
    await this.publish(SOCKET_EVENT_ALL, eventInfo);

    return true;
  }

  private async publish<T extends SocketMessage> (topic: string, eventInfo: T) {
    const id = v4();
    this.pubSubService.publish(topic, {
      id,
      message: eventInfo
    });

    return id;
  }

  waitForPeerMessage (channel: string, message?: any): Promise<boolean> {
    return firstValueFrom(
      race(
        this.peerMessages$.pipe(
          filter((inboundMessage) => inboundMessage.channel === channel)
        ).pipe(
          map((inboundMessage) => {
            return !message || message === inboundMessage.message;
          }),
        ),
        of(null)
          .pipe(delay(10000))
          .pipe(map(() => false)),
      ),
    );
  }
  // waitForUserMessage (userId: string, channel: string, message?: any): Promise<boolean> {
  //   const messages$ = this.getUserMessages$(userId);

  //   return firstValueFrom(
  //     race(
  //       messages$.pipe(filter((inboundMessage) => inboundMessage.channel === channel)).pipe(
  //         map((inboundMessage) => {
  //           return !message || message === inboundMessage.message;
  //         }),
  //       ),
  //       of(null)
  //         .pipe(delay(10000))
  //         .pipe(map(() => false)),
  //     ),
  //   );
  // }
}
