// FILEPATH: /Users/john.saady/Projects/Personal/nestjs-enhanced/packages/sockets/src/socket.propagator.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { Subject, delay, firstValueFrom, of } from 'rxjs';
import { Socket } from 'socket.io';
import * as uuid from 'uuid';
import { SocketStateService } from './socket-state.service';
import { SOCKET_EVENT_ALL_AUTHENTICATED, SOCKET_EVENT_PEERS, SOCKET_EVENT_SOCKET, SOCKET_EVENT_USER, SocketIOPropagatorService, SpecificSocketPropagationMessage, UserSocketPropagationMessage, WrappedMessage, messageEmittedChannel } from './socket.propagator';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('SocketIOPropagatorService', () => {
  let service: SocketIOPropagatorService;
  let socketStateService: SocketStateService;

  afterEach(() => {
    jest.resetAllMocks();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketIOPropagatorService,
        {
          provide: SocketStateService,
          useValue: {
            getBySocketId: jest.fn(),
            getByUserId: jest.fn(),
            getAll: jest.fn(),
          }, // Mock SocketStateService if necessary
        },
        {
          provide: 'PUB_SUB_PROVIDER',
          useValue: {
            subscribe: jest.fn().mockReturnValue(new Subject()),
            publish: jest.fn(),
          }
        }
      ],
    }).compile();

    service = module.get<SocketIOPropagatorService>(SocketIOPropagatorService);
    socketStateService = module.get<SocketStateService>(SocketStateService);
    jest.spyOn(service.logger, 'warn');
    jest.spyOn(service.logger, 'log');
  });

  it('should be able to receive the socket.io server', () => {
    const server = {};
    service.injectSocketServer(server as any);
    expect(service['socketServer']).toBe(server);
  });

  describe('consumeToSocketSendEvent', () => {
    const mockSocketId = 'mock-socket-id';
    const mockChannel = 'mock-channel';
    const mockMessage = 'mock-message';
    const mockEventId = 'mock-event-id';

    let mockSocket: Socket;
    let mockEventInfo: WrappedMessage<SpecificSocketPropagationMessage>;

    beforeEach(() => {
      mockSocket = {
        emit: jest.fn(),
      } as any;

      mockEventInfo = {
        id: mockEventId,
        message: {
          channel: mockChannel,
          message: mockMessage,
          targetSocketId: mockSocketId,
        },
      };
    });

    it('should send message to socket and publish event if socket exists', async () => {
      (mockSocket.emit as jest.Mock).mockResolvedValue(true);
      // Arrange
      jest.spyOn(service['socketStateService'], 'getBySocketId').mockReturnValue(mockSocket);
      jest.spyOn(service, 'publish' as any).mockResolvedValue(undefined);

      // Act
      await service['consumeToSocketSendEvent'](mockEventInfo);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith(mockChannel, mockMessage);
      expect(service.logger.log).toHaveBeenCalledWith(`Successfully sent message: ${mockEventId}`);
      expect(service['publish']).toHaveBeenCalledWith(SOCKET_EVENT_PEERS, {
        message: mockEventId,
        channel: messageEmittedChannel,
      });
    });

    it('should not send message to socket and not publish event if socket does not exist', async () => {
      // Arrange
      jest.spyOn(service['socketStateService'], 'getBySocketId').mockReturnValue(undefined);
      jest.spyOn(service, 'publish' as any).mockResolvedValue(undefined);

      // Act
      await service['consumeToSocketSendEvent'](mockEventInfo);

      // Assert
      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(service.logger.warn).toHaveBeenCalledWith(`Skipping ${mockEventId}`);
      expect(service['publish']).not.toHaveBeenCalled();
    });

    it('should send message to socket and not publish event if targetSocketId is not provided', async () => {
      // Arrange
      mockEventInfo.message.targetSocketId = '';
      jest.spyOn(service['socketStateService'], 'getBySocketId').mockReturnValue(mockSocket);
      jest.spyOn(service, 'publish' as any).mockResolvedValue(undefined);

      // Act
      await service['consumeToSocketSendEvent'](mockEventInfo);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith(mockChannel, mockMessage);
      expect(service['publish']).not.toHaveBeenCalled();
    });

    it('should log warning if socket.emit returns false', async () => {
      // Arrange
      jest.spyOn(service['socketStateService'], 'getBySocketId').mockReturnValue(mockSocket);
      mockSocket.emit = jest.fn().mockReturnValue(false);
      jest.spyOn(service, 'publish' as any).mockResolvedValue(undefined);

      // Act
      await service['consumeToSocketSendEvent'](mockEventInfo);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith(mockChannel, mockMessage);
      expect(service.logger.warn).toHaveBeenCalledWith(`Unsuccessfully sent message: ${mockEventId}`);
      expect(service['publish']).not.toHaveBeenCalled();
    });
  });

  describe('emitToSocket', () => {
    const mockSocketId = 'mock-socket-id';
    const mockChannel = 'mock-channel';
    const mockMessage = 'mock-message';

    let mockEventInfo: SpecificSocketPropagationMessage;

    beforeEach(() => {
      mockEventInfo = {
        channel: mockChannel,
        message: mockMessage,
        targetSocketId: mockSocketId,
      };
    });

    it('should publish event and wait for peer message', async () => {
      // Arrange
      const mockMessageId = 'mock-message-id';
      jest.spyOn(service, 'publish' as any).mockResolvedValue(mockMessageId);
      jest.spyOn(service, 'waitForPeerMessage').mockResolvedValue(true);

      // Act
      const result = await service.emitToSocket(mockEventInfo);

      // Assert
      expect(service['publish']).toHaveBeenCalledWith(SOCKET_EVENT_SOCKET, mockEventInfo);
      expect(service.waitForPeerMessage).toHaveBeenCalledWith(messageEmittedChannel, mockMessageId);
      expect(result).toBe(true);
    });

    it('should return false if waitForPeerMessage returns false', async () => {
      // Arrange
      const mockMessageId = 'mock-message-id';
      jest.spyOn(service, 'publish' as any).mockResolvedValue(mockMessageId);
      jest.spyOn(service, 'waitForPeerMessage').mockResolvedValue(false);

      // Act
      const result = await service.emitToSocket(mockEventInfo);

      // Assert
      expect(service['publish']).toHaveBeenCalledWith(SOCKET_EVENT_SOCKET, mockEventInfo);
      expect(service.waitForPeerMessage).toHaveBeenCalledWith(messageEmittedChannel, mockMessageId);
      expect(result).toBe(false);
    });
  });

  describe('emitToUser', () => {
    const mockUserId = 'mock-user-id';
    const mockChannel = 'mock-channel';
    const mockMessage = 'mock-message';

    let mockEventInfo: UserSocketPropagationMessage;

    beforeEach(() => {
      mockEventInfo = {
        channel: mockChannel,
        message: mockMessage,
        userId: mockUserId,
      };
    });

    it('should return false if userId is not provided', async () => {
      // Arrange
      mockEventInfo.userId = '';

      // Act
      const result = await service.emitToUser(mockEventInfo);

      // Assert
      expect(result).toBe(false);
    });

    it('should publish event and wait for peer message', async () => {
      // Arrange
      const mockMessageId = 'mock-message-id';
      jest.spyOn(service, 'publish' as any).mockResolvedValue(mockMessageId);
      jest.spyOn(service, 'waitForPeerMessage').mockResolvedValue(true);

      // Act
      const result = await service.emitToUser(mockEventInfo);

      // Assert
      expect(service['publish']).toHaveBeenCalledWith(SOCKET_EVENT_USER, mockEventInfo);
      expect(service.waitForPeerMessage).toHaveBeenCalledWith(messageEmittedChannel, mockMessageId);
      expect(result).toBe(true);
    });

    it('should return false if waitForPeerMessage returns false', async () => {
      // Arrange
      const mockMessageId = 'mock-message-id';
      jest.spyOn(service, 'publish' as any).mockResolvedValue(mockMessageId);
      jest.spyOn(service, 'waitForPeerMessage').mockResolvedValue(false);

      // Act
      const result = await service.emitToUser(mockEventInfo);

      // Assert
      expect(service['publish']).toHaveBeenCalledWith(SOCKET_EVENT_USER, mockEventInfo);
      expect(service.waitForPeerMessage).toHaveBeenCalledWith(messageEmittedChannel, mockMessageId);
      expect(result).toBe(false);
    });
  });
  describe('consumeToUserSendEvent', () => {
    const mockUserId = 'mock-user-id';
    const mockChannel = 'mock-channel';
    const mockMessage = 'mock-message';
    const mockOriginSocketId = 'mock-origin-socket-id';
    const mockEventId = 'mock-event-id';
  
    let mockSocket1: Socket;
    let mockSocket2: Socket;
    let mockEventInfo: WrappedMessage<UserSocketPropagationMessage>;
  
    beforeEach(() => {

      mockSocket1 = {
        id: 'mock-socket-id-1',
        emit: jest.fn(),
      } as any;
  
      mockSocket2 = {
        id: 'mock-socket-id-2',
        emit: jest.fn(),
      } as any;
  
      mockEventInfo = {
        id: mockEventId,
        message: {
          userId: mockUserId,
          channel: mockChannel,
          message: mockMessage,
          originSocketId: mockOriginSocketId,
        },
      };

    });
  
    it('should send message to all sockets except the origin socket and publish event if sockets exist', async () => {
      // Arrange
      (mockSocket1.emit as jest.Mock).mockResolvedValue(true);
      (mockSocket2.emit as jest.Mock).mockResolvedValue(true);
      jest.spyOn(service['socketStateService'], 'getByUserId').mockReturnValue([mockSocket1, mockSocket2]);
      jest.spyOn(service, 'publish' as any).mockResolvedValue(undefined);
  
      // Act
      await service['consumeToUserSendEvent'](mockEventInfo);
  
      // Assert
      expect(mockSocket1.emit).toHaveBeenCalledWith(mockChannel, mockMessage);
      expect(mockSocket2.emit).toHaveBeenCalledWith(mockChannel, mockMessage);
      expect(service.logger.log).toHaveBeenCalledWith(`Found 2 sockets for user ${mockUserId}`);
      expect(service['publish']).toHaveBeenCalledWith(SOCKET_EVENT_PEERS, {
        message: mockEventId,
        channel: messageEmittedChannel,
      });
    });
  
    it('should not send message to any sockets and not publish event if no sockets exist', async () => {
      // Arrange
      jest.spyOn(service['socketStateService'], 'getByUserId').mockReturnValue([]);
      jest.spyOn(service, 'publish' as any).mockResolvedValue(undefined);
  
      // Act
      await service['consumeToUserSendEvent'](mockEventInfo);
  
      // Assert
      expect(mockSocket1.emit).not.toHaveBeenCalled();
      expect(mockSocket2.emit).not.toHaveBeenCalled();
      expect(service.logger.log).toHaveBeenCalledWith(`Found 0 sockets for user ${mockUserId}`);
      expect(service['publish']).not.toHaveBeenCalled();
    });
  
    it('should not send message to the origin socket and publish event if other sockets exist', async () => {
      // Arrange
      (mockSocket1.emit as jest.Mock).mockResolvedValue(true);
      (mockSocket2.emit as jest.Mock).mockResolvedValue(true);
      jest.spyOn(service['socketStateService'], 'getByUserId').mockReturnValue([mockSocket1, mockSocket2, { id: mockOriginSocketId } as any]);
      jest.spyOn(service, 'publish' as any).mockResolvedValue(undefined);
  
      // Act
      await service['consumeToUserSendEvent'](mockEventInfo);
  
      // Assert
      expect(mockSocket1.emit).toHaveBeenCalledWith(mockChannel, mockMessage);
      expect(mockSocket2.emit).toHaveBeenCalledWith(mockChannel, mockMessage);
      expect(service.logger.log).toHaveBeenCalledWith(`Found 2 sockets for user ${mockUserId}`);
      expect(service['publish']).toHaveBeenCalledWith(SOCKET_EVENT_PEERS, {
        message: mockEventId,
        channel: messageEmittedChannel,
      });
    });
  
    it('should not send message to any sockets and not publish event if emit returns false', async () => {
      // Arrange
      mockSocket1.emit = jest.fn().mockReturnValue(false);
      mockSocket2.emit = jest.fn().mockReturnValue(false);
      jest.spyOn(service['socketStateService'], 'getByUserId').mockReturnValue([mockSocket1, mockSocket2]);
      jest.spyOn(service, 'publish' as any).mockResolvedValue(undefined);
  
      // Act
      await service['consumeToUserSendEvent'](mockEventInfo);
  
      // Assert
      expect(mockSocket1.emit).toHaveBeenCalledWith(mockChannel, mockMessage);
      expect(mockSocket2.emit).toHaveBeenCalledWith(mockChannel, mockMessage);
      expect(service.logger.log).toHaveBeenCalledWith(`Found 2 sockets for user ${mockUserId}`);
      expect(service['publish']).not.toHaveBeenCalled();
    });
  });

  describe('consumeToAuthenticatedEvent', () => {
    it('should send message to all authenticated sockets', () => {
      // Arrange
      const mockChannel = 'mock-channel';
      const mockMessage = 'mock-message';
      const mockSocket1 = {
        emit: jest.fn(),
      } as any;
      const mockSocket2 = {
        emit: jest.fn(),
      } as any;
      jest.spyOn(service['socketStateService'], 'getAll').mockReturnValue([mockSocket1, mockSocket2]);

      // Act
      service['consumeToAuthenticatedEvent']({
        id: 'mock-id',
        message: {
          channel: mockChannel,
          message: mockMessage,
        },
      });

      // Assert
      expect(mockSocket1.emit).toHaveBeenCalledWith(mockChannel, mockMessage);
      expect(mockSocket2.emit).toHaveBeenCalledWith(mockChannel, mockMessage);
    });
  });

  describe('emitToAuthenticated', () => {
    it('should publish event to all authenticated sockets and return true', async () => {
      // Arrange
      const mockEventInfo = {
        channel: 'mock-channel',
        message: 'mock-message',
      };
      jest.spyOn(service, 'publish' as any).mockResolvedValue(undefined);
    
      // Act
      const result = await service.emitToAuthenticated(mockEventInfo);
    
      // Assert
      expect(service['publish']).toHaveBeenCalledWith(SOCKET_EVENT_ALL_AUTHENTICATED, mockEventInfo);
      expect(result).toBe(true);
    });
  });

  describe('consumeFromPeersEvent', () => {
    it('should add message to peerMessages$ subject', async () => {
      // Arrange
      const mockChannel = 'mock-channel';
      const mockMessage = 'mock-message';
      const mockEventInfo = {
        id: 'mock-event-id',
        message: {
          channel: mockChannel,
          message: mockMessage,
        },
      };
      const latestValue$ = firstValueFrom(service['peerMessages$']);
    
      // Act
      service['consumeFromPeersEvent'](mockEventInfo);

      const latestValue = await latestValue$;
    
      // Assert
      expect(latestValue).toEqual({ channel: mockChannel, message: mockMessage });
    });
  });

  describe('publish', () => {
    const mockTopic = 'mock-topic';
    const mockEventInfo = {
      channel: 'mock-channel',
      message: 'mock-message',
      targetSocketId: 'mock-target-socket-id',
    };
  
    beforeEach(() => {
      jest.spyOn(service['pubSubService'], 'publish').mockResolvedValue(undefined);
    });
  
    it('should publish event to pub/sub service and return message ID', async () => {
      // Arrange
      const mockMessageId = 'mock-message-id';
      jest.spyOn(uuid, 'v4').mockReturnValue(mockMessageId);
  
      // Act
      const result = await service['publish'](mockTopic, mockEventInfo);
  
      // Assert
      expect(service['pubSubService'].publish).toHaveBeenCalledWith(mockTopic, {
        id: mockMessageId,
        message: mockEventInfo,
      });
      expect(result).toBe(mockMessageId);
    });
  });

  describe('waitForPeerMessage', () => {
    const mockChannel = 'mock-channel';
    const mockMessage = 'mock-message';
  
    it('should return true if message is received on the channel', async () => {
      // Arrange
      const mockInboundMessage = {
        channel: mockChannel,
        message: mockMessage,
      };
      jest.spyOn(service['peerMessages$'], 'pipe').mockReturnValue(of(mockInboundMessage));
  
      // Act
      const result = await service.waitForPeerMessage(mockChannel, mockMessage);
  
      // Assert
      expect(result).toBe(true);
    });
  
    it('should return true if message is not provided and any message is received on the channel', async () => {
      // Arrange
      const mockInboundMessage = {
        channel: mockChannel,
        message: mockMessage,
      };
      const peerMessages$ = service['peerMessages$'] = new Subject();
  
      // Act
      const result$ = service.waitForPeerMessage(mockChannel);
      peerMessages$.next(mockInboundMessage);
      const result = await result$;
  
      // Assert
      expect(result).toBe(true);
    });
  
    it('should return false if message is not received on the channel', async () => {
      // Arrange
      service['waitTimeout'] = 500;
      const peerMessages$ = service['peerMessages$'] = new Subject();
      
      // Act
      const result$ = service.waitForPeerMessage(mockChannel, mockMessage);
      peerMessages$.next({ channel: 'some-other-channel', message: 'some-other-message' });

      const result = await result$;
  
      // Assert
      expect(result).toBe(false);
    });
  
    it('should return false if message is not received on the channel within 10 seconds', async () => {
      // Arrange
      service['waitTimeout'] = 500;
  
      // Act
      const result = await service.waitForPeerMessage(mockChannel, mockMessage);
  
      // Assert
      expect(result).toBe(false);
    });
  });
});