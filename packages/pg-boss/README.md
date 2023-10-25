# Readme for the NestJS Queue Module and Service
## QueueModule

The QueueModule is a NestJS module designed to seamlessly integrate with [pg-boss](https://github.com/timgit/pg-boss/blob/master/docs/readme.md), a job queue system for PostgreSQL. It offers a way to register and configure the pg-boss job queue and provides utilities to handle job explorations and middleware services.

### Features:
Automatic starting of the pg-boss instance upon module configuration.
Decorators to manage processing 

#### Install:
`npm install pg-boss @nestjs-enhanced/pg-boss`

### Usage:

#### Background work:
```ts
import { ProcessQueue } from '@nestjs-enhanced/pg-boss';

@Injectable()
export class MyWorkerService {
  @ProcessQueue('some-queue-name')
  processSomeQueue(job: Job) {
    // do work with job
  }
}

import { PgBoss } from '@nestjs-enhanced/pg-boss';

@Injectable()
export class MyOtherService {
  constructor (
    private pgBoss: PgBoss
  )

  doWork() {
    this.pgBoss.send('set_embeddings', {
      id: newNote.id
    });
  }
}
```

#### Cron style work:
```ts
import { PgBoss } from '@nestjs-enhanced/pg-boss';

@Injectable()
export class MyOtherService {
  constructor (
    private pgBoss: PgBoss
  )

  @ScheduledQueue('* * * * *')
  doWork() {
    // do work every minute of every day
  }
}
```

### QueueModule
#### `register`:
```ts
import { QueueModule } from 'path-to-queue-module';

@Module({
  imports: [
    QueueModule.register({
      database: 'your-database-connection-string-or-config'
      // ... other PgBoss options
    })
  ]
})
export class AppModule {}
```

#### `registerAsync`:
```ts
import { QueueModule } from 'path-to-queue-module';

@Module({
  imports: [
    QueueModule.registerAsync({
      useFactory: async (configService) => {
        return {
          database: configService.get('DATABASE_URL')
          // ... other PgBoss options
        };
      },
      inject: [ConfigService],
    })
  ]
})
export class AppModule {}
```

### Decorators


#### `ProcessQueue`

The `ProcessQueue` decorator calls the `work` method of `pg-boss` and can perform a job on a specific queue. It follows the `work` method of `pg-boss`.

It takes a queue name and an [options](https://github.com/timgit/pg-boss/blob/master/docs/readme.md#work) object to control how the work is done.

#### `ScheduledQueue`

The `ScheduledQueue` decorator calls the `schedule` method of `pg-boss` and can perform a job on a schedule. It is useful for running work on a schedule where only one worker should be processing it at a time.

It takes a string of the cron schedule and an optional [options](https://github.com/timgit/pg-boss/blob/master/docs/readme.md#sendname-data-options) object to control how the job is scheduled

### QueueMiddlewareService

The QueueMiddlewareService provides a way to register middlewares that get called for each job coming through the queue. These middlewares follow the express pattern, taking in a job and a next function, and can be used to execute any pre/post-processing steps on jobs like logging or cleanup.

#### Usage:
To use the middleware service, you first need to inject it into your service or controller:

```ts
import { QueueMiddlewareService } from 'path-to-queue-middleware-service';

@Injectable()
export class YourService {
  constructor(private queueMiddlewareService: QueueMiddlewareService) {}

  yourMethod() {
    this.queueMiddlewareService.register((job, next) => {
      // Your middleware logic here
      next();
    });
  }
}
```
Here, `job` represents the current job being processed in the queue, and next is a callback function that, when called, moves on to the next middleware in the queue (or finalizes the job if there are no more middlewares).
