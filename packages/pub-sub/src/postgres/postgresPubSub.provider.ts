import type { Client } from 'pg';
export const PG_PUBSUB_CLIENT = 'PG_PUBSUB_CLIENT';

export const PG_PUBSUB_OPTIONS = 'PG_PUBSUB_OPTIONS'

export type PGPubSubOptions = ConstructorParameters<typeof Client>[0];

export const pgPubSubProvider = {
  provide: PG_PUBSUB_CLIENT,
  useFactory: async (options: PGPubSubOptions) => {
    const pg = await import('pg');
    const client = new pg.default.Client(options);

    await client.connect();
    
    return client;
  },
  inject: [PG_PUBSUB_OPTIONS]
};
