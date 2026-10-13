import { type ParseOptions } from './types'

export const parse = (raw: unknown, { fallback, onError, reviver }: ParseOptions = {}): unknown => {
  try {
    if (Array.isArray(raw)) {
      return raw
    }

    if (typeof raw === 'object' && raw !== null) {
      const isBinary = raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)
      const prototype = Object.getPrototypeOf(raw)

      if (isBinary === false && (prototype === Object.prototype || prototype === null)) {
        return raw
      }
    }

    return JSON.parse(typeof raw === 'string' ? raw : String(raw), reviver)
  } catch (error) {
    onError?.(error)

    return fallback
  }
}
