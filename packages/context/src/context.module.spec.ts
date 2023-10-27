import { Test, TestingModule } from '@nestjs/testing';
import { AsyncLocalStorage } from 'async_hooks';
import { ContextModule } from './context.module';
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextService } from './request-context.service';

describe('ContextModule', () => {
  let module: ContextModule;
  let testingModule: TestingModule;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        ContextModule,
        RequestContextService,
        RequestContextMiddleware,
        {
          provide: AsyncLocalStorage,
          useValue: new AsyncLocalStorage(),
        },
      ],
    }).compile();

    module = testingModule.get<ContextModule>(ContextModule);
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should configure middleware', () => {
    const consumer = { apply: jest.fn().mockReturnThis(), forRoutes: jest.fn() };
    module.configure(consumer);
    expect(consumer.apply).toHaveBeenCalledWith(expect.any(Function));
    expect(consumer.forRoutes).toHaveBeenCalledWith('*');
  });
});