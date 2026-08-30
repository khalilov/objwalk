import { deepEqual } from './deepEqual'

export const equally = (a: unknown, b: unknown): boolean =>
  deepEqual(a, b, new WeakMap<object, WeakSet<object>>())
