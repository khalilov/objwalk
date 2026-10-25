import { each } from './each'

export const clone = <T>(value: T): T => {
  const store = new WeakMap<object, object>()

  const cloneValue = <U>(x: U): U => {
    if (x === null || typeof x !== 'object') {
      return x
    }

    const obj = x as object

    if (store.has(obj)) {
      return store.get(obj) as U
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as U
    }

    if (obj instanceof RegExp) {
      return new RegExp(obj.source, obj.flags) as U
    }

    if (Array.isArray(obj)) {
      const arr: unknown[] = []
      store.set(obj, arr)

      for (let i = 0; i < obj.length; i++) {
        arr[i] = cloneValue(obj[i])
      }

      return arr as U
    }

    const result: Record<PropertyKey, unknown> = {}
    store.set(obj, result)

    each(Reflect.ownKeys(obj), (_index, key: PropertyKey) => {
      result[key] = cloneValue((obj as Record<PropertyKey, unknown>)[key])
    })

    return result as U
  }

  return cloneValue(value)
}
