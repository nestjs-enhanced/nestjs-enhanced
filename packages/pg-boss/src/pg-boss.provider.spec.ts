import { Test, TestingModule } from '@nestjs/testing';
import PgBoss from 'pg-boss';
import { PG_BOSS_OPTIONS, PgBossProvider } from './pg-boss.provider';

jest.mock('pg-boss');

describe('PgBossProvider', () => {
  let testingModule: TestingModule;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        PgBossProvider,
        {
          provide: PG_BOSS_OPTIONS,
          useValue: {}, // Mock PgBoss options if necessary
        },
      ],
    }).compile();
  });

  it('should be defined', () => {
    const pgBoss = testingModule.get<PgBoss>(PgBoss);
    expect(pgBoss).toBeDefined();
  });

  it('should create PgBoss instance with provided options', () => {
    const options = testingModule.get(PG_BOSS_OPTIONS);
    const pgBoss = testingModule.get<PgBoss>(PgBoss);
    expect(PgBoss).toHaveBeenCalledWith(options);
    expect(pgBoss).toBeInstanceOf(PgBoss);
  });
});