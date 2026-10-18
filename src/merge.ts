import { type ObjwalkObject } from './pick'
import { isPlainObject } from './helpers/isPlainObject'

const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype'])

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
