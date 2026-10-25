export const deepEqual = (x: unknown, y: unknown, store: WeakMap<object, WeakSet<object>>): boolean => {
  if (x === y || (Number.isNaN(x) && Number.isNaN(y))) {
    return true
  }

  if (x !== null && y !== null && typeof x === 'object' && typeof y === 'object') {
    let seen = store.get(x)

    if (seen !== undefined && seen.has(y)) {
      return true
    }

    if (seen === undefined) {
      seen = new WeakSet()
      store.set(x, seen)
    }

    seen.add(y)

    if (x instanceof Date || y instanceof Date) {
      return x instanceof Date && y instanceof Date && x.getTime() === y.getTime()
    }

    if (x instanceof RegExp || y instanceof RegExp) {
      return x instanceof RegExp && y instanceof RegExp && x.toString() === y.toString()
    }

    if (Array.isArray(x) && Array.isArray(y)) {
      const { length } = x
      let equal = length === y.length
      let index = 0

      // Visit holes as undefined instead of skipping them.
      while (equal && index < length) {
        equal = deepEqual(x[index], y[index], store)
        index += 1
      }

      return equal
    } else if (Array.isArray(x) === false && Array.isArray(y) === false) {
      const keysX = Reflect.ownKeys(x)
      const keysY = Reflect.ownKeys(y)

      return keysX.length === keysY.length && keysX.every((key) =>
        Object.hasOwn(y, key) &&
        deepEqual((x as Record<PropertyKey, unknown>)[key], (y as Record<PropertyKey, unknown>)[key], store)
      )
    }
  }

  return false
}
