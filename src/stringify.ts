import { type StringifyOptions } from './types'

export const stringify = (
  value: unknown,
  { fallback, onError, replacer, space }: StringifyOptions = {}
): string | undefined => {
  try {
    if (typeof replacer === 'function') {
      return JSON.stringify(value, replacer, space)
    }

    return JSON.stringify(value, replacer, space)
  } catch (error) {
    onError?.(error)

    return fallback
  }
}
