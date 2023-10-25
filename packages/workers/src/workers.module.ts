import { Global, Module } from '@nestjs/common';
import { WorkerService } from './worker.service.js';

@Global()
@Module({ providers: [WorkerService], exports: [WorkerService] })
export class WorkersModule { }
