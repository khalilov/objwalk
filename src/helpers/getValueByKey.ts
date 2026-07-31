import { type PickOptions } from '../types'

export const getValueByKey = (
  object: any,
  key: string,
  { inherited = true, ignore = [] }: PickOptions = {}
): any => {
  if (
    object === null ||
    object === undefined ||
    ignore.includes(key) ||
    (!inherited && !Object.hasOwn(object, key))
  ) {
    return undefined
  }

  return object[key]
}
