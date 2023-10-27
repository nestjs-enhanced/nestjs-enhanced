# Workers

A basic nestjs module for creating new threads to perform work. Currently supports [child_process](https://nodejs.org/api/child_process.html#child-process) and [worker_threads](https://nodejs.org/api/worker_threads.html#worker-threads).


`child_process` actually spawns a new process from the running node.js process. It has its own memory space and it's own V8 instance. These provide more isolation and control over the environment in which something runs.

`worker_threads` create a new thread under the same V8 process. These tend to start up faster and can access some of the same memory through the use of `SharedArrayBuffer`.


> See [this article](https://amplication.com/blog/nodejs-worker-threads-vs-child-processes-which-one-should-you-use) for a deeper dive into the differences between the two.

**tldr;** Generally, `worker_threads` is better suited for most workloads. However, do your own research and understand your use-case to make a better decision into what you're trying to solve.


### Install:
`npm install @nestjs-enhanced/workers`

### Usage:
**Register Module**
```ts
import { WorkersModule } from '@nestjs-enhanced/workers';

@Module({
  imports: [
    WorkersModule
  ],
  // ...
})
export class AppModule {
  // ...
}
```

**Create a worker**
```ts
import { Runtime, WorkerService } from '@nestjs-enhanced/workers';

@Injectable()
export class MyService {
  constructor (
    private workerService: WorkerService
  ) { }

  doSomeWork () {
    const path = 'path/to/your/worker.js'
    this.workerService.createWorker(path, { runtime: Runtime.worker_thread });
    this.workerService.getMessages(path)
      .subscribe((message) => {
        // message from your worker
      });
  }
}
```

```ts
// path/to/your/worker.js
import { parentPort } from 'worker_threads';


parentPort.on('message', () => {
  // do work

  parentPort?.postMessage('some message');
});
```

### Future:
