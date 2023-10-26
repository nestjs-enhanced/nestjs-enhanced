import { Test, TestingModule } from '@nestjs/testing';
import { QueueMiddlewareService } from './queue-middleware.service';
import { InternalQueueMiddlewareService } from './internal-queue-middleware.service';

describe('QueueMiddlewareService', () => {
  let service: QueueMiddlewareService;
  let internalService: InternalQueueMiddlewareService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueMiddlewareService,
        {
          provide: InternalQueueMiddlewareService,
          useValue: {
            register: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueueMiddlewareService>(QueueMiddlewareService);
    internalService = module.get<InternalQueueMiddlewareService>(InternalQueueMiddlewareService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register middleware', () => {
    const mockMiddleware = jest.fn();
    service.register(mockMiddleware);
    expect(internalService.register).toHaveBeenCalledWith(mockMiddleware);
  });
});