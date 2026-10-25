import { each, type EachOptions } from './each'
import { createPath } from './helpers/createPath'
import { isPlainObject } from './helpers/isPlainObject'
import { type WalkKey } from './types'

export type MapCallback<TResult = unknown, TKey extends WalkKey = WalkKey> = (
  key: TKey,
  value: any,
  path: string
) => TResult

export type MapOptions = {
  descend?: EachOptions['descend']
  shallow?: boolean
}

type Map = {
  <TResult>(
    data: readonly unknown[],
    callback: MapCallback<TResult, number>,
    options: MapOptions & { shallow: true }
  ): TResult[]
  <TResult>(
    data: Record<string, unknown>,
    callback: MapCallback<TResult, string>,
    options: MapOptions & { shallow: true }
  ): Record<string, TResult>
  <TResult>(data: readonly unknown[], callback: MapCallback<TResult>, options?: MapOptions): TResult[]
  <TResult>(data: Record<string, unknown>, callback: MapCallback<TResult>, options?: MapOptions): Record<string, TResult>
  <TResult>(
    data: Record<string, unknown> | readonly unknown[],
    callback: MapCallback<TResult>,
    options?: MapOptions
  ): Record<string, TResult> | TResult[]
}

export const map: Map = (
  data: Record<string, unknown> | readonly unknown[],
  callback: MapCallback<any, any>,
  { descend, shallow = false }: MapOptions = {}
) => {
  const walk = (value: any, key: WalkKey | undefined, path: string, segments: WalkKey[]): any => {
    const root = key === undefined
    let mapped = root ? (Array.isArray(value) ? [] : {}) : value

    if (
      (root || Array.isArray(value) || isPlainObject(value)) &&
      (root || shallow === false) &&
      (descend === undefined || descend({ key, value, path, segments: [...segments] }))
    ) {
      mapped = Array.isArray(value) ? Array(value.length) : {}
      each(value, (key, value) => {
        const childPath = createPath(path, key, Array.isArray(mapped))
        const childSegments = [...segments, key]
        const result = walk(value, key, childPath, childSegments)

        Object.defineProperty(mapped, key, {
          value: result,
          writable: true,
          enumerable: true,
          configurable: true,
        })
      }, { descend: ({ segments }) => segments.length === 0 })
    }

    return key !== undefined ? callback(key, mapped, path) : mapped
  }

  return walk(data, undefined, '', [])
}
