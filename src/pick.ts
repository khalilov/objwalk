import { getValueByKey, getValueByPath, parsePathSelection } from './helpers'
import { type PickOptions } from './types'

export type ObjwalkObject = Record<string, any>

export const pick = (
  data: ObjwalkObject = {},
  path: string = '',
  options: PickOptions = {}
): any => {
  const { cleanPath, keys } = parsePathSelection(path)
  const value = getValueByPath(data, cleanPath, options)

  if (keys.length === 0 && keys !== 'all') {
    return value
  }

  if (keys === 'all') {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).filter((key) => !options.ignore?.includes(key))
    }

    return []
  }

  if (value && typeof value === 'object') {
    if (keys.length === 1) {
      return getValueByKey(value, keys[0], options)
    }

    return keys.reduce(
      (result, key) => ({
        ...result,
        [key]: getValueByKey(value, key, options),
      }),
      {}
    )
  }

  return undefined
}
