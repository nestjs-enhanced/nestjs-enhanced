import { Test, TestingModule } from '@nestjs/testing';
import { PgPubSubService } from './postgresPubSub.service';
import { Client } from 'pg';

describe('PgPubSubService', () => {
  let service: PgPubSubService;
  let client: Client;

  beforeEach(async () => {
    client = new Client();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PgPubSubService,
        {
          provide: 'PG_PUBSUB_CLIENT',
          useValue: client,
        },
      ],
    }).compile();

    service = module.get<PgPubSubService>(PgPubSubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register listener', async () => {
    const mockQuery = jest.spyOn(client, 'query').mockImplementation(() => Promise.resolve());
    const channel = 'testChannel';
    const handler = jest.fn();
    await service['registerListener'](channel, handler);
    expect(mockQuery).toHaveBeenCalledWith(`LISTEN ${channel.toLowerCase()}`);
  });

  it('should unregister listener', async () => {
    const mockQuery = jest.spyOn(client, 'query').mockImplementation(() => Promise.resolve());
    const channel = 'testChannel';
    const handler = jest.fn();
    await service['registerListener'](channel, handler);
    await service['unregisterListener'](channel, handler);
    expect(mockQuery).toHaveBeenCalledWith(`UNLISTEN ${channel.toLowerCase()}`);
  });

  it('should publish message', async () => {
    const mockQuery = jest.spyOn(client, 'query').mockImplementation(() => Promise.resolve());
    const channel = 'testChannel';
    const message = 'testMessage';
    await service.publish(channel, message);
    const encodedMessage = Buffer.from(JSON.stringify(message)).toString('base64');
    expect(mockQuery).toHaveBeenCalledWith(`NOTIFY ${channel.toLowerCase()}, '${encodedMessage}'`);
  });

  it('should subscribe to channel', done => {
    const channel = 'testChannel';
    const message = 'testMessage';
    const subscription = service.subscribe(channel).subscribe({
      next: (value) => {
        expect(value).toEqual(message);
        done();
      }
    });
    client.emit('notification', { channel, payload: Buffer.from(JSON.stringify(message)).toString('base64') });
    subscription.unsubscribe();
  });
  it('should subscribe to channel (non-json)', done => {
    const channel = 'testChannel';
    const message = 'testMessage';
    const subscription = service.subscribe(channel).subscribe({
      next: (value) => {
        expect(value).toEqual(message);
        done();
      }
    });
    client.emit('notification', { channel, payload: message });
    subscription.unsubscribe();
  });
});