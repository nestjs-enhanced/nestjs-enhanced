// create a module for the postgres pub sub provider
import { UnwrapForRootArgs } from '@nestjs-enhanced/core';
import { DynamicModule, Module } from '@nestjs/common';
import { PGPubSubOptions, PG_PUBSUB_OPTIONS, pgPubSubProvider } from './postgres/postgresPubSub.provider';
import { PgPubSubService } from './postgres/postgresPubSub.service';
import { PUB_SUB_PROVIDER } from './pubSub.service';

@Module({ })
export class PubSubModule {
  static registerPostgres (useFactory: () => PGPubSubOptions) {
    return this.registerPostgresAsync({ useFactory })
  }

  static registerPostgresAsync <A extends any[]>(
    opts: {
      useFactory: (...args: A) => PGPubSubOptions,
      inject?: UnwrapForRootArgs<A>,
      imports?: DynamicModule['imports'],
    }
  ): DynamicModule {
    return {
      global: true,
      module: PubSubModule,
      imports: opts.imports ?? [],
      providers: [
        {
          provide: PG_PUBSUB_OPTIONS,
          useFactory: opts.useFactory,
          inject: opts.inject
        },
        {
          provide: PUB_SUB_PROVIDER,
          useClass: PgPubSubService
        },
        pgPubSubProvider
      ],
      exports: [
        {
          provide: PUB_SUB_PROVIDER,
          useClass: PgPubSubService
        },
        pgPubSubProvider
      ]
    }
  }
}
