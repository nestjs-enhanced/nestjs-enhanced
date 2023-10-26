import { Test, TestingModule } from '@nestjs/testing';
import { QueueExplorer } from './queue.explorer';
import PgBoss from 'pg-boss';
import { DiscoveryService } from '@nestjs/core';
import { InternalQueueMiddlewareService } from './internal-queue-middleware.service';
import { QueueHandlerType, queueMetadataStore } from './queue.decorator';

describe('QueueExplorer', () => {
  let explorer: QueueExplorer;
  let pgBoss: PgBoss;
  let discoveryService: DiscoveryService;
  let intQueue: InternalQueueMiddlewareService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueExplorer,
        {
          provide: PgBoss,
          useValue: {}, // Mock PgBoss if necessary
        },
        {
          provide: DiscoveryService,
          useValue: {}, // Mock DiscoveryService if necessary
        },
        {
          provide: InternalQueueMiddlewareService,
          useValue: {}, // Mock InternalQueueMiddlewareService if necessary
        },
      ],
    }).compile();

    explorer = module.get<QueueExplorer>(QueueExplorer);
    pgBoss = module.get<PgBoss>(PgBoss);
    discoveryService = module.get<DiscoveryService>(DiscoveryService);
    intQueue = module.get<InternalQueueMiddlewareService>(InternalQueueMiddlewareService);
  });

  it('should explore all queues', async () => {
    const middleware = jest.fn().mockImplementation((job, next) => {
      next();
    });
    intQueue.getFullMiddleware = jest.fn().mockReturnValue(middleware);

    const mockProviders = [
      { instance: { foo: jest.fn() }, token: 'FOO_TOKEN' },
      { instance: { bar: jest.fn() }, token: 'BAR_TOKEN' },
    ];
    discoveryService.getProviders = jest.fn().mockReturnValue(mockProviders);

    const mockQueueMetadata = new Map([
      ['queue1', [
        { key: 'foo', provider: 'FOO_TOKEN', options: { someOption: 'someValue' }, handlerType: QueueHandlerType.basic },
        { key: 'bar', provider: 'BAR_TOKEN', options: null, handlerType: QueueHandlerType.schedule, schedule: '0 0 * * *' },
      ]],
      ['queue2', [
        { key: 'bar', provider: 'BAR_TOKEN', options: null, handlerType: QueueHandlerType.basic },
      ]],
    ]);
    queueMetadataStore.clear();
    mockQueueMetadata.forEach((value, key) => queueMetadataStore.set(key, value as any));

    const mockJob = { id: 'jobId' };
    const mockWork = jest.fn().mockImplementation((queueName, options, handler) => options instanceof Function ? options(mockJob) : handler(mockJob, options));
    const mockSchedule = jest.fn();
    pgBoss.work = mockWork;
    pgBoss.schedule = mockSchedule;

    await explorer.explore();

    expect(intQueue.getFullMiddleware).toHaveBeenCalled();
    expect(discoveryService.getProviders).toHaveBeenCalled();

    expect(mockWork).toHaveBeenCalledTimes(3);
    expect(mockWork).toHaveBeenCalledWith('queue1', { someOption: 'someValue' }, expect.any(Function));
    expect(mockWork).toHaveBeenCalledWith('queue1', expect.any(Function));
    expect(mockWork).toHaveBeenCalledWith('queue2', expect.any(Function));

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledWith('queue1', '0 0 * * *', null);

    expect(mockProviders[0].instance.foo).toHaveBeenCalledWith(mockJob);
    expect(mockProviders[1].instance.bar).toHaveBeenCalledWith(mockJob);

    expect(middleware).toHaveBeenCalledTimes(3);
    expect(middleware).toHaveBeenNthCalledWith(1, mockJob, expect.any(Function));
    expect(middleware).toHaveBeenNthCalledWith(2, mockJob, expect.any(Function));
    expect(middleware).toHaveBeenNthCalledWith(3, mockJob, expect.any(Function));
  });
});