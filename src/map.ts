import { each, type WalkKey } from './each'

export type MapCallback<TStore extends Record<string, any> = Record<string, any>> = (
  key: WalkKey,
  value: any,
  store: TStore,
  path: string
) => void

export const map = <TStore extends Record<string, any> = Record<string, any>>(
  data: any,
  callback: MapCallback<TStore>,
  store: TStore = {} as TStore
): TStore => {
  each(data, (key, value, path) => {
    callback(key, value, store, path)
  })

  return store
}
