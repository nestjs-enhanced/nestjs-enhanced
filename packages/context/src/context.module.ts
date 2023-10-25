import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { ContextMiddleware } from './request-context.middleware.js';
import { RequestContextService } from './request-context.service.js';

@Module({
  providers: [
    RequestContextService,
    ContextMiddleware,
    {
      provide: AsyncLocalStorage,
      useValue: new AsyncLocalStorage(),
    },
  ],
  exports: [RequestContextService],
})
@Global()
export class ContextModule implements NestModule {
  configure (consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes('*');
  }
}
