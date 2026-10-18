import { type ObjwalkObject } from '../pick'

export const isPlainObject = (value: unknown): value is ObjwalkObject => {
  if (value !== null && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value)

    return prototype === Object.prototype || prototype === null
  }

  return false
}
