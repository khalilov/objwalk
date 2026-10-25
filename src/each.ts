import { createPath } from './helpers/createPath'
import { isWalkable } from './helpers/isWalkable'
import { type WalkKey } from './types'

export type EachCallback<TKey extends WalkKey | undefined = WalkKey> = (
  key: TKey,
  value: any,
  path: string,
  segments: WalkKey[]
) => unknown

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
  const walk = (value: any, path: string, segments: WalkKey[], key: WalkKey | undefined): boolean => {
    const proceed = segments.length > 0 || root
      ? callback(key, value, path, [...segments]) !== false
      : true

    if (proceed && isWalkable(value) && (descend === undefined || descend({ key, value, path, segments: [...segments] }))) {
      if (Array.isArray(value)) {
        return value.every((item, index) =>
          walk(item, createPath(path, index, true), [...segments, index], index)
        )
      }

      return Object.keys(value).every((childKey) =>
        walk(value[childKey], createPath(path, childKey, false), [...segments, childKey], childKey)
      )
    }

    return proceed
  }

  walk(data, '', [], undefined)
}
