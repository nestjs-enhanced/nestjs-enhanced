import { Provider } from '@nestjs/common';
import PgBoss from 'pg-boss';
export type QueueModuleOptions = PgBoss.ConstructorOptions;

export const PG_BOSS_OPTIONS = 'PG_BOSS_OPTIONS';

export const PgBossProvider: Provider = {
  provide: PgBoss,
  useFactory: (opts: QueueModuleOptions) => {
    return new PgBoss(opts);
  },
  inject: [PG_BOSS_OPTIONS]
}
