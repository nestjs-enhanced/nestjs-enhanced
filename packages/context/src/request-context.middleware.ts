import { Injectable, NestMiddleware } from '@nestjs/common';
import { RequestContextService } from './request-context.service.js';

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor (
    private contextService: RequestContextService
  ) { }

  use (req: any, res: any, next: (error?: any) => void) {
    this.contextService.start(req, next);
  }
}
