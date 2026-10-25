import { each } from './each'
import { type ObjwalkObject } from './pick'
import { isPlainObject } from './helpers/isPlainObject'

const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype'])

export const merge = <T extends ObjwalkObject>(target: T, ...sources: unknown[]): T => {
  const targetRecord: ObjwalkObject = target

  each(sources, (_index, source: unknown) => {
    if (isPlainObject(source)) {
      each(Object.entries(source), (_index, [key, sourceValue]: [string, any]) => {
        if (unsafeKeys.has(key) === false) {
          const targetValue = targetRecord[key]

          if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
            merge(targetValue, sourceValue)
          } else {
            targetRecord[key] = sourceValue
          }
        }
      }, { descend: ({ segments }) => segments.length === 0 })
    }
  }, { descend: ({ segments }) => segments.length === 0 })

  return target
}
