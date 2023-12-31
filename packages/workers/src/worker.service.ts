import { Injectable, Logger } from '@nestjs/common';
import { ChildProcess, fork } from 'child_process';
import { Observable, Subject } from 'rxjs';
import { Worker } from 'worker_threads';

export enum Runtime {
  /**
   * Uses the worker_threads module to create a worker. See https://nodejs.org/api/worker_threads.html
   */
  worker_thread,
  /**
   * Uses the child_process module to create a worker. See https://nodejs.org/api/child_process.html
   */
  child_process_fork,
};

export interface CreateWorkerConfig {
  runtime: Runtime;
  /**
   * An optional id to identify the worker. Used for when multiple workers are created from the same path.
   */
  id?: string;
}

@Injectable()
export class WorkerService {
  private workers = new Map<string, ChildProcess | Worker>;
  private workerOutputs = new Map<string, Observable<any>>();
  private logger = new Logger('WorkerService');

  createWorker (path: string, { id, runtime }: CreateWorkerConfig) {
    const key = id ?? path;
    const workerOutput = new Subject();
    this.workerOutputs.set(key, workerOutput);

    let proc: ChildProcess|Worker;
    switch (runtime) {
      case Runtime.child_process_fork:
        proc = fork(path);
        break;
      case Runtime.worker_thread:
        proc = new Worker(path);
        break; 
    }
    this.workers.set(key, proc);

    proc.on('message', (message) => workerOutput.next(message));
    proc.on('disconnect', () => {
      workerOutput.complete();
      this.workerOutputs.delete(key);
      this.workers.delete(key);
    });
  }

  getMessages<T = any>(idOrPath: string): Observable<T> {
    return this.workerOutputs.get(idOrPath)!;
  }

  async stopWorker (idOrPath: string) {
    const worker = this.workers.get(idOrPath);

    if (!worker) {
      this.logger.warn('No worker found for ' + idOrPath);
      return false;
    }

    if (worker instanceof ChildProcess) {
      return worker.kill();
    } else if (worker instanceof Worker) {
      const killed = await worker.terminate();

      return killed;
    }
  }

  sendMessageToWorker (idOrPath: string, message: any) {
    const worker = this.workers.get(idOrPath);

    if (!worker) {
      this.logger.warn('No worker found for ' + idOrPath);

      return false;
    }

    if (worker instanceof ChildProcess) {
      return worker.send(message)
    } else if (worker instanceof Worker) {
      worker.postMessage(message);
      return true;
    }
  }
}
