import { Test, TestingModule } from '@nestjs/testing';
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextService } from './request-context.service';

describe('ContextMiddleware', () => {
  let middleware: RequestContextMiddleware;
  let contextService: RequestContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestContextMiddleware,
        {
          provide: RequestContextService,
          useValue: {
            start: jest.fn(),
          },
        },
      ],
    }).compile();

    middleware = module.get<RequestContextMiddleware>(RequestContextMiddleware);
    contextService = module.get<RequestContextService>(RequestContextService);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should start context', () => {
    const req = {};
    const next = jest.fn();
    middleware.use(req, {}, next);
    expect(contextService.start).toHaveBeenCalledWith(req, next);
  });
});