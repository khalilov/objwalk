export const deepEqual = (x: unknown, y: unknown, store: WeakMap<object, WeakSet<object>>): boolean => {
  if (Number.isNaN(x) && Number.isNaN(y)) {
    return true
  }

  if (x === y) {
    return true
  }

  if (x == null || y == null) {
    return false
  }

  if (typeof x !== 'object' || typeof y !== 'object') {
    return false
  }

  let seen = store.get(x)

  if (seen !== undefined && seen.has(y)) {
    return true
  }

  if (seen === undefined) {
    seen = new WeakSet()
    store.set(x, seen)
  }

  seen.add(y)

  if (x instanceof Date && y instanceof Date) {
    return x.getTime() === y.getTime()
  }

  if (x instanceof RegExp && y instanceof RegExp) {
    return x.toString() === y.toString()
  }

  const isArrayX = Array.isArray(x)
  const isArrayY = Array.isArray(y)

  if (isArrayX !== isArrayY) {
    return false
  }

  if (isArrayX) {
    return equalArrays(x as unknown[], y as unknown[], store)
  }

  return equalObjects(x, y, store)
}

const equalArrays = (
  x: unknown[],
  y: unknown[],
  store: WeakMap<object, WeakSet<object>>
): boolean =>
  x.length === y.length && x.every((value, index) => deepEqual(value, y[index], store))

const equalObjects = (
  x: object,
  y: object,
  store: WeakMap<object, WeakSet<object>>
): boolean => {
  const keysX = Reflect.ownKeys(x)
  const keysY = Reflect.ownKeys(y)

  if (keysX.length !== keysY.length) {
    return false
  }

  return keysX.every((key) => {
    if (!Object.hasOwn(y, key)) {
      return false
    }

    return deepEqual((x as Record<PropertyKey, unknown>)[key], (y as Record<PropertyKey, unknown>)[key], store)
  })
}
