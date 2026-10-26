import { createPath } from './helpers/createPath'
import { isWalkable } from './helpers/isWalkable'
import { type WalkKey } from './types'

export type EachCallback<TKey extends WalkKey | undefined = WalkKey, TValue = any> = (
  key: TKey,
  value: TValue,
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
  shallow?: boolean
}

type DictionaryValue<TData> = TData extends unknown ? TData[keyof TData] : never

type Each = {
  <TData extends readonly unknown[]>(
    data: TData,
    callback: EachCallback<number, TData[number]>,
    options: EachOptions & { shallow: true; root?: false }
  ): void
  <TData extends Record<string, unknown>>(
    data: TData,
    callback: EachCallback<string, DictionaryValue<TData>>,
    options: EachOptions & { shallow: true; root?: false }
  ): void
  <TData extends readonly unknown[]>(
    data: TData,
    callback: EachCallback<number | undefined, TData[number] | TData>,
    options: EachOptions & { shallow: true }
  ): void
  <TData extends Record<string, unknown>>(
    data: TData,
    callback: EachCallback<string | undefined, DictionaryValue<TData> | TData>,
    options: EachOptions & { shallow: true }
  ): void
  (data: any, callback: EachCallback, options?: EachOptions & { root?: false }): void
  (data: any, callback: EachCallback<WalkKey | undefined>, options: EachOptions): void
}

export const each: Each = (
  data: any,
  callback: EachCallback<any>,
  { root = false, descend, shallow = false }: EachOptions = {}
): void => {
  const walk = (value: any, path: string, segments: WalkKey[], key: WalkKey | undefined): boolean => {
    const proceed = segments.length > 0 || root
      ? callback(key, value, path, [...segments]) !== false
      : true

    if (
      proceed &&
      (segments.length === 0 || shallow === false) &&
      isWalkable(value) &&
      (descend === undefined || descend({ key, value, path, segments: [...segments] }))
    ) {
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
