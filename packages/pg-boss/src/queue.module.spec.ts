import { Test, TestingModule } from '@nestjs/testing';
import PgBoss from 'pg-boss';
import { PG_BOSS_OPTIONS } from './pg-boss.provider';
import { QueueExplorer } from './queue.explorer';
import { QueueModule } from './queue.module';

describe('QueueModule', () => {
  let queueModule: QueueModule;
  let pgBoss: PgBoss;
  let explorer: QueueExplorer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueModule,
        {
          provide: PgBoss,
          useValue: {
            start: jest.fn(),
            on: jest.fn(),
          },
        },
        {
          provide: QueueExplorer,
          useValue: {
            explore: jest.fn(),
          },
        },
        {
          provide: PG_BOSS_OPTIONS,
          useValue: {}, // Mock PgBoss options if necessary
        },
      ],
    }).compile();

    queueModule = module.get<QueueModule>(QueueModule);
    pgBoss = module.get<PgBoss>(PgBoss);
    explorer = module.get<QueueExplorer>(QueueExplorer);
  });

  it('should be defined', () => {
    expect(queueModule).toBeDefined();
  });

  it('should start PgBoss and explore queues on configure', async () => {
    await queueModule.configure();
    expect(pgBoss.start).toHaveBeenCalled();
    expect(pgBoss.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(explorer.explore).toHaveBeenCalled();
  });

  it('should log error when PgBoss emits error', async () => {
    const error = new Error('Test error');
    const loggerSpy = jest.spyOn(queueModule.logger, 'error');
    (pgBoss as any as Record<string, jest.Mock>).on.mockImplementation((event, handler) => {
    if (event === 'error') {
        handler(error);
      }
    });

    await queueModule.configure();
    expect(loggerSpy).toHaveBeenCalledWith(error);
  });

  it('should register QueueModule as global module', () => {
    expect(QueueModule.register({})).toHaveProperty('global', true);
  });
});