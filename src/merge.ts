import { type ObjwalkObject } from './pick'

const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype'])

const isPlainObject = (value: unknown): value is ObjwalkObject => {
  if (value === null || typeof value !== 'object') {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export const merge = <T extends ObjwalkObject>(target: T, ...sources: unknown[]): T => {
  const targetRecord: ObjwalkObject = target

  for (const source of sources) {
    if (!isPlainObject(source)) {
      continue
    }

    for (const [key, sourceValue] of Object.entries(source)) {
      if (unsafeKeys.has(key)) {
        continue
      }

      const targetValue = targetRecord[key]

      if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
        merge(targetValue, sourceValue)
      } else {
        targetRecord[key] = sourceValue
      }
    }
  }

  return target
}
