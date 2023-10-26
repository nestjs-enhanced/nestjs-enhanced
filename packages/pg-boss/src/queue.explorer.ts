import { Injectable, Logger } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import PgBoss from 'pg-boss';
import { InternalQueueMiddlewareService } from './internal-queue-middleware.service';
import { QueueHandlerType, queueMetadataStore } from './queue.decorator';

@Injectable()
export class QueueExplorer {
  logger = new Logger('QueueExplorer');

  constructor (
    private pgBoss: PgBoss,
    private discoveryService: DiscoveryService,
    private intQueue: InternalQueueMiddlewareService 
  ) { }

  async explore() {
    const middleware = this.intQueue.getFullMiddleware();

    for(const [queueName, value] of queueMetadataStore) {
      const providerMap = new Map(this.discoveryService.getProviders()
        .filter(({ token }) => value.some(({ provider }) => provider === token))
        .map(({ instance, token }) => [token, instance]));

      for (const queue of value) {
        const { key, provider, options } = queue;
        const instance = providerMap.get(provider);
        const handler = async (job: PgBoss.Job<unknown>): Promise<void> => {
          this.logger.log(`Starting job ${job.id} => ${queueName}`)
          middleware(job as any, async () => {
            await instance[key].call(instance, job);
          });
        };

        (options && queue.handlerType === QueueHandlerType.basic) ?
          this.pgBoss.work(queueName, queue.options as any, handler) :
          this.pgBoss.work(queueName, handler);

        if (queue.handlerType === QueueHandlerType.schedule) {
          await this.pgBoss.schedule(queueName, queue.schedule, queue.options);
        }
      }
    }
  }
}
