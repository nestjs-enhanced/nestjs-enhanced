import { DynamicModule, InjectionToken } from '@nestjs/common';

export type UnwrapForRootArgs<A extends any[]> = {
  [P in keyof A]: InjectionToken<A[P]>
};
export interface ForRootConfig<T, A extends any[]> {
  useFactory: (...args: A) => T;
  inject?: UnwrapForRootArgs<A>;
  imports: DynamicModule['imports'];
}
