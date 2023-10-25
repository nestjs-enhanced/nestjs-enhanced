import { BatchWorkOptions, Job, ScheduleOptions, WorkOptions } from 'pg-boss';

export enum QueueHandlerType {
  basic,
  schedule
}

export interface BasicQueueMetadata {
  provider: Function;
  key: string | symbol;
  handlerType: QueueHandlerType.basic;
  options?: WorkOptions|BatchWorkOptions;
}

export interface ScheduledQueueMetadata {
  provider: Function;
  key: string | symbol;
  handlerType: QueueHandlerType.schedule;
  schedule: string;
  options?: ScheduleOptions;
}

export type QueueMetadata = ScheduledQueueMetadata|BasicQueueMetadata;

export const queueMetadataStore = new Map<string, QueueMetadata[]>();

export const ProcessQueue = (queueName: string, options?: WorkOptions) => (item: any, key: string | symbol, _descriptor: TypedPropertyDescriptor<(job: Job<any>) => any>) => {
  const metadata = queueMetadataStore.get(queueName) ?? [];

  metadata.push({
    provider: item.constructor,
    key,
    handlerType: QueueHandlerType.basic,
    options
  });

  queueMetadataStore.set(queueName, metadata);
};

export const ScheduledQueue = (schedule: string, options?: ScheduleOptions) => (item: Object, key: string | symbol, _descriptor: TypedPropertyDescriptor<(job: Job) => any>) => {
  const queueName = `${item.constructor.name}_${String(key)}`;
  const metadata = queueMetadataStore.get(queueName) ?? [];

  metadata.push({
    provider: item.constructor,
    key,
    handlerType: QueueHandlerType.schedule,
    schedule,
    options
  });

  queueMetadataStore.set(queueName, metadata);
};


