import { type WalkKey } from '../types'

export const createPath = (parentPath: string, key: WalkKey, parentIsArray: boolean): string => {
  if (parentIsArray) {
    return parentPath + '[' + key + ']'
  }

  return parentPath ? parentPath + '.' + key : String(key)
}
