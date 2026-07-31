import { type PickOptions } from '../types'
import { getValueByKey } from './getValueByKey'

const arraySegmentRegex = /^(\w+)\[(\d+)\]$/

export const getValueByPath = (
  obj: any,
  path: string,
  options: PickOptions = {}
): any => {
  if (!path) return obj

  return path.split('.').reduce((result: any, current: string) => {
    if (result === null || result === undefined) {
      return undefined
    }

    const match = current.match(arraySegmentRegex)

    if (match) {
      const [, key, index] = match
      const array = getValueByKey(result, key, options)

      return Array.isArray(array) ? getValueByKey(array, index, options) : undefined
    }

    return getValueByKey(result, current, options)
  }, obj)
}
