import { Test, TestingModule } from '@nestjs/testing';
import { Client } from 'pg';
import { PG_PUBSUB_CLIENT, PG_PUBSUB_OPTIONS, pgPubSubProvider } from './postgresPubSub.provider';

jest.mock('pg');

describe('pgPubSubProvider', () => {
  let testingModule: TestingModule;

  const options = {
    connectionString: 'postgres://fakeuser:fakepassword@localhost:5432/fakedb',
    password: 'fakepassword'
  };
  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        pgPubSubProvider,
        {
          provide: PG_PUBSUB_OPTIONS,
          useValue: options,
        },
      ],
    }).compile();
  });

  it('should be defined', () => {
    const pgClient = testingModule.get<Client>(PG_PUBSUB_CLIENT);
    expect(pgClient).toBeDefined();
  });

  it('should create Client instance with provided options', async () => {
    const storedOptions = testingModule.get(PG_PUBSUB_OPTIONS);
    const pgClient = testingModule.get<Client>(PG_PUBSUB_CLIENT);
    expect(Client).toHaveBeenCalledWith(options);
    expect(options).toBe(storedOptions);
    expect(pgClient.connect).toHaveBeenCalled();
  });
});