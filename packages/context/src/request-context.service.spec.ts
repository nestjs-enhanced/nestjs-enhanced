import { Test, TestingModule } from '@nestjs/testing';
import { RequestContextService } from './request-context.service';
import { AsyncLocalStorage } from 'async_hooks';
import { Request } from 'express';

describe('RequestContextService', () => {
  let service: RequestContextService;
  let als: AsyncLocalStorage<Request>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestContextService,
        {
          provide: AsyncLocalStorage,
          useValue: {
            run: jest.fn(),
            getStore: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RequestContextService>(RequestContextService);
    als = module.get<AsyncLocalStorage<Request>>(AsyncLocalStorage);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should start context', () => {
    const request = {} as Request;
    const cb = jest.fn();
    service.start(request, cb);
    expect(als.run).toHaveBeenCalledWith(request, cb);
  });

  it('should get context', () => {
    service.getContext();
    expect(als.getStore).toHaveBeenCalled();
  });
});