import { deepEqual } from './deepEqual'
import { getValueByPath } from './helpers/getValueByPath'

export const equally = (a: unknown, b: unknown, paths?: string[]): boolean => {
  if (paths !== undefined) {
    return paths.every((path) => equally(getValueByPath(a, path), getValueByPath(b, path)))
  }

  return deepEqual(a, b, new WeakMap<object, WeakSet<object>>())
}
