
import { Injectable } from '@nestjs/common';
import { Job } from 'pg-boss';

export type QueueMiddleware = <T = unknown>(job: Job<T>, next: (err?: Error) => void) => void;

@Injectable()
export class InternalQueueMiddlewareService {
  private middlewares: QueueMiddleware[] = [];

  register(mw: QueueMiddleware) {
    this.middlewares.push(mw);
  }

  getFullMiddleware() {
    return (job: Job<any>, next: () => void) => {
      let i = 0;
      const cb = (err?: Error) => {
        if (err) throw err;

        const nextMiddleware = this.middlewares[i];
        ++i;
        if (nextMiddleware) {
          nextMiddleware(job, cb);
        } else {
          next();
        }
      }

      cb();
    }
  }
}
