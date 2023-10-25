import { Inject } from '@nestjs/common';
import { Observable } from 'rxjs';

export interface PubSubService<T> {
  publish<K extends keyof T & string> (topic: keyof T, message: T[K]): Promise<unknown>;
  publish (topic: string, message: any): Promise<unknown>;

  subscribe<K extends keyof T> (topic: K): Observable<T[K]>;
  subscribe (topic: string): Observable<unknown>;
}

export const PUB_SUB_PROVIDER = 'PUB_SUB_PROVIDER';
export const InjectPubSub = () => Inject(PUB_SUB_PROVIDER);
