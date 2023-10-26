import { Job } from 'pg-boss';
import { ProcessQueue, ScheduledQueue, queueMetadataStore, QueueHandlerType } from './queue.decorator';

describe('Queue Decorators', () => {
  beforeEach(() => {
    queueMetadataStore.clear();
  });

  it('should add metadata for ProcessQueue', () => {
    class TestClass {
      @ProcessQueue('testQueue', { teamConcurrency: 1 })
      testMethod(job: Job) {}
    }

    const metadata = queueMetadataStore.get('testQueue')!;
    expect(metadata).toBeDefined();
    expect(metadata).toHaveLength(1);
    expect(metadata[0]).toEqual({
      provider: TestClass,
      key: 'testMethod',
      handlerType: QueueHandlerType.basic,
      options: { teamConcurrency: 1 }
    });
  });

  it('should add metadata for ScheduledQueue', () => {
    class TestClass {
      @ScheduledQueue('0 0 * * *', { tz: 'America/Denver' })
      testMethod(job: Job) {}
    }

    const queueName = `${TestClass.name}_testMethod`;
    const metadata = queueMetadataStore.get(queueName)!;
    expect(metadata).toBeDefined();
    expect(metadata).toHaveLength(1);
    expect(metadata[0]).toEqual({
      provider: TestClass,
      key: 'testMethod',
      handlerType: QueueHandlerType.schedule,
      schedule: '0 0 * * *',
      options: { tz: 'America/Denver' }
    });
  });
});