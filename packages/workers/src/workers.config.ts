import { Inject } from '@nestjs/common';
import { ForRootConfig } from '@nestjs-enhanced/core';

export enum Runtime {
  worker_thread,
  child_process_fork
}

export interface WorkersConfig {
  runtime: Runtime;
}

export const WORKERS_CONFIG = 'WORKERS_CONFIG';

export const InjectWorkerConfig = () => Inject(WORKERS_CONFIG);
export const CreateWorkerConfigProvider = <A extends any[]>({
  useFactory,
  inject
}: ForRootConfig<WorkersConfig, A>) => ({
  provide: WORKERS_CONFIG,
  useFactory,
  inject
});
