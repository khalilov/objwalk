import { createPath } from './helpers/createPath'
import { isWalkable } from './helpers/isWalkable'
import { type WalkKey } from './types'

export type EachCallback<TKey extends WalkKey | undefined = WalkKey> = (
  key: TKey,
  value: any,
  path: string,
  segments: WalkKey[]
) => void

export type EachEntry = {
  key: WalkKey | undefined
  value: any
  path: string
  segments: WalkKey[]
}

export type EachOptions = {
  root?: boolean
  descend?: (entry: EachEntry) => boolean
}

type Each = {
  (data: any, callback: EachCallback, options?: EachOptions & { root?: false }): void
  (data: any, callback: EachCallback<WalkKey | undefined>, options: EachOptions): void
}

export const each: Each = (
  data: any,
  callback: EachCallback<any>,
  { root = false, descend }: EachOptions = {}
): void => {
  const walk = (value: any, path: string, segments: WalkKey[], key: WalkKey | undefined): void => {
    if (segments.length > 0 || root) {
      callback(key, value, path, [...segments])
    }

    if (isWalkable(value) && (descend === undefined || descend({ key, value, path, segments: [...segments] }))) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          walk(item, createPath(path, index, true), [...segments, index], index)
        })
      } else {
        Object.entries(value).forEach(([childKey, item]) => {
          walk(item, createPath(path, childKey, false), [...segments, childKey], childKey)
        })
      }
    }
  }

  walk(data, '', [], undefined)
}
