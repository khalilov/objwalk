import { getValueByPath, parsePathSelection } from './helpers'

export type ObjwalkObject = Record<string, any>

export const pick = (data: ObjwalkObject = {}, path: string = ''): any => {
  const { cleanPath, keys } = parsePathSelection(path)
  const value = getValueByPath(data, cleanPath)

  if (keys.length === 0 && keys !== 'all') {
    return value
  }

  if (keys === 'all') {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
    }

    return []
  }

  if (value && typeof value === 'object') {
    if (keys.length === 1) {
      return value[keys[0]]
    }

    return keys.reduce(
      (result, key) => ({
        ...result,
        [key]: value[key],
      }),
      {}
    )
  }

  return undefined
}
