import { createPath, isWalkable } from './helpers'
import { type WalkKey } from './types'

export type EachCallback = (key: WalkKey, value: any, path: string) => void

export const each = (data: any, callback: EachCallback): void => {
  const walk = (value: any, path: string, key: WalkKey, parentIsArray: boolean) => {
    const currentPath = path || createPath('', key, parentIsArray)

    callback(key, value, currentPath)

    if (!isWalkable(value)) {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        walk(item, createPath(currentPath, index, true), index, true)
      })
      return
    }

    Object.entries(value).forEach(([childKey, item]) => {
      walk(item, createPath(currentPath, childKey, false), childKey, false)
    })
  }

  if (!isWalkable(data)) {
    return
  }

  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      walk(item, createPath('', index, true), index, true)
    })
    return
  }

  Object.entries(data).forEach(([key, value]) => {
    walk(value, createPath('', key, false), key, false)
  })
}
