import { Global, Module } from '@nestjs/common';
import { WorkerService } from './worker.service';

@Global()
@Module({ providers: [WorkerService], exports: [WorkerService] })
export class WorkersModule { }
