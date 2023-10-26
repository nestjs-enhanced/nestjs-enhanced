import { Type } from '@nestjs/common';
import { PG_PUBSUB_OPTIONS, pgPubSubProvider } from './postgres/postgresPubSub.provider';
import { PgPubSubService } from './postgres/postgresPubSub.service';
import { PubSubModule, } from './pubSub.module';
import { PUB_SUB_PROVIDER } from './pubSub.service';

describe('PubSubModule', () => {
  it('should register Postgres async', async () => {
    const mockOptions = {};
    const mockUseFactory = jest.fn().mockReturnValue(mockOptions);
    const mockInject = ['TEST_PROVIDER'];
    const mockImports: Type[] = [];

    const dynamicModule = PubSubModule.registerPostgresAsync({
      useFactory: mockUseFactory,
      inject: mockInject,
      imports: mockImports,
    });

    expect(dynamicModule.global).toBe(true);
    expect(dynamicModule.module).toBe(PubSubModule);
    expect(dynamicModule.imports).toEqual(mockImports);

    expect(dynamicModule.providers).toHaveLength(3);
    expect(dynamicModule.providers![0]).toEqual({
      provide: PG_PUBSUB_OPTIONS,
      useFactory: mockUseFactory,
      inject: mockInject,
    });
    expect(dynamicModule.providers![1]).toEqual({
      provide: PUB_SUB_PROVIDER,
      useClass: PgPubSubService,
    });
    expect(dynamicModule.providers![2]).toBe(pgPubSubProvider);

    expect(dynamicModule.exports).toHaveLength(2);
    expect(dynamicModule.exports![0]).toEqual({
      provide: PUB_SUB_PROVIDER,
      useClass: PgPubSubService,
    });
    expect(dynamicModule.exports![1]).toBe(pgPubSubProvider);
  });
});