import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextService } from './request-context.service';

@Module({
  providers: [
    RequestContextService,
    RequestContextMiddleware,
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
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
