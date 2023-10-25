import { PubSubModule } from '@nestjs-enhanced/pub-sub';
import { Global, Module } from '@nestjs/common';
import { SocketStateService } from './socket-state.service';
import { SocketIOPropagatorService } from './socket.propagator';

@Global()
@Module({
  imports: [PubSubModule],
  controllers: [],
  providers: [
    SocketStateService,
    SocketIOPropagatorService,
  ],
  exports: [
    SocketIOPropagatorService
  ],
})
export class SocketsModule { }
