import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ChildProcess, fork } from 'child_process';
import { Subject } from 'rxjs';
import { Worker } from 'worker_threads';
import { Runtime, WorkerService } from './worker.service';

jest.mock('child_process', () => {
  class ChildProcess2 {
    on = jest.fn();
  }

  return {
    ChildProcess: ChildProcess2,
    fork: jest.fn().mockReturnValue(new ChildProcess2()),
  };
});

jest.mock('worker_threads', () => ({
  Worker: class {
    on = jest.fn();
  },
}));

describe('WorkerService', () => {
  let service: WorkerService;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkerService],
    }).compile();

    service = module.get<WorkerService>(WorkerService);
    loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorker', () => {
    it('should create a child process worker', () => {
      const path = 'test.js';
      const id = 'test-worker-1';
      const runtime = Runtime.child_process_fork;

      service.createWorker(path, { id, runtime });

      expect(fork).toHaveBeenCalledWith(path);
      expect(service['workers'].get(id)).toBeDefined();
      expect(service['workers'].get(id)).toBeInstanceOf(ChildProcess);
    });

    it('should create a worker thread', () => {
      const path = 'test.js';
      const id = 'test-worker-2';
      const runtime = Runtime.worker_thread;

      service.createWorker(path, { id, runtime });

      expect(service['workers'].get(id)).toBeDefined();
      expect(service['workers'].get(id)).toBeInstanceOf(Worker);
    });

    it('should handle disconnecting worker', () => {
      const path = 'test.js';
      const id = 'test-worker-3';
      const runtime = Runtime.worker_thread;

      service.createWorker(path, { id, runtime });

      const worker = service['workers'].get(id);
      expect(worker).toBeDefined();

      const workerOutput = service['workerOutputs'].get(id);
      expect(workerOutput).toBeDefined();

      (worker!.on as jest.Mock).mock.calls[1][1]();

      expect(service['workers'].get(id)).toBeUndefined();
      expect(service['workerOutputs'].get(id)).toBeUndefined();
    })
  });

  describe('getMessages', () => {
    it('should return an observable for the given worker id', () => {
      const id = 'test-worker';
      service.createWorker('', { id, runtime: Runtime.child_process_fork });
      const workerOutput = service.getMessages(id);

      expect(workerOutput).toBeInstanceOf(Subject);
      expect(service['workerOutputs'].get(id)).toBe(workerOutput);
    });
  });

  describe('stopWorker', () => {
    it('should kill a child process worker', async () => {
      const id = 'test-worker';
      const worker = new ChildProcess();
      worker.kill = jest.fn().mockResolvedValue(true);
      service['workers'].set(id, worker);

      const result = await service.stopWorker(id);

      expect(result).toBe(true);
      expect(worker.kill).toHaveBeenCalled();
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should terminate a worker thread', async () => {
      const id = 'test-worker';
      const worker = new Worker('');
      const terminate = worker.terminate = jest.fn().mockResolvedValue(true);
      service['workers'].set(id, worker);

      const result = await service.stopWorker(id);

      expect(result).toBe(true);
      expect(terminate).toHaveBeenCalled();
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should log a warning if no worker is found for the given id', async () => {
      const id = 'test-worker';

      const result = await service.stopWorker(id);

      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith('No worker found for ' + id);
    });
  });

  describe('sendMessageToWorker', () => {
    it('should send a message to a child process worker', () => {
      const id = 'test-worker';
      const message = { test: true };
      const worker = new ChildProcess();
      worker.send = jest.fn();
      service['workers'].set(id, worker);

      const result = service.sendMessageToWorker(id, message);

      expect(result).toBe(worker.send(message));
      expect(worker.send).toHaveBeenCalledWith(message);
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should post a message to a worker thread', () => {
      const id = 'test-worker';
      const message = { test: true };
      const worker = new Worker('');
      worker.postMessage = jest.fn();
      service['workers'].set(id, worker);

      service.sendMessageToWorker(id, message);

      expect(worker.postMessage).toHaveBeenCalledWith(message);
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should log a warning if no worker is found for the given id', () => {
      const id = 'test-worker';
      const message = { test: true };

      const result = service.sendMessageToWorker(id, message);

      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith('No worker found for ' + id);
    });
  });
});