import { Test, TestingModule } from '@nestjs/testing';
import { InternalQueueMiddlewareService } from './internal-queue-middleware.service';
import { Job } from 'pg-boss';

describe('InternalQueueMiddlewareService', () => {
  let service: InternalQueueMiddlewareService;
  let mockMiddlewares: jest.Mock[];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InternalQueueMiddlewareService],
    }).compile();

    service = module.get<InternalQueueMiddlewareService>(InternalQueueMiddlewareService);
    mockMiddlewares = [jest.fn(), jest.fn(), jest.fn()];
    mockMiddlewares.forEach(mw => service.register(mw));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process middlewares correctly', () => {
    const mockJob = {} as Job;
    const mockNext = jest.fn();
    const fullMw = service.getFullMiddleware();
    fullMw(mockJob, mockNext);

    // Check first middleware is called
    expect(mockMiddlewares[0]).toHaveBeenCalled();

    // Simulate calling the callback in the first middleware
    const cb = mockMiddlewares[0].mock.calls[0][1];
    cb();

    // Check second middleware is called
    expect(mockMiddlewares[1]).toHaveBeenCalled();

    // Simulate calling the callback in the second middleware
    const cb2 = mockMiddlewares[1].mock.calls[0][1];
    cb2();

    // Check third middleware is called
    expect(mockMiddlewares[2]).toHaveBeenCalled();

    // Simulate calling the callback in the third middleware
    const cb3 = mockMiddlewares[2].mock.calls[0][1];
    cb3();

    // Check next is called after all middlewares
    expect(mockNext).toHaveBeenCalled();
  });

  it('should throw error if middleware callback receives an error', () => {
    const mockJob = {} as Job;
    const mockNext = jest.fn();
    const fullMw = service.getFullMiddleware();
    fullMw(mockJob, mockNext);

    // Simulate calling the callback in the first middleware with an error
    const error = new Error('Test error');
    const cb = mockMiddlewares[0].mock.calls[0][1];
    expect(() => cb(error)).toThrow(error);
  });
});