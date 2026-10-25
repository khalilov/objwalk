import { describe, expect, it } from 'vitest'

import { clone } from '../src/clone'

describe('clone', () => {
  it('returns primitives as is', () => {
    expect(clone(1)).toBe(1)
    expect(clone('a')).toBe('a')
    expect(clone(null)).toBe(null)
    expect(clone(undefined)).toBe(undefined)
  })

  it('deeply clones nested objects and arrays', () => {
    const source = { a: { b: [1, 2] }, c: [{ d: 3 }] }
    const result = clone(source)

    expect(result).not.toBe(source)
    expect(result.a).not.toBe(source.a)
    expect(result.a.b).not.toBe(source.a.b)
    expect(result).toStrictEqual(source)
  })

  it('clones Date and RegExp', () => {
    const date = new Date('2026-01-01')
    const regExp = /ab+/g

    const clonedDate = clone(date)
    const clonedRegExp = clone(regExp)

    expect(clonedDate).not.toBe(date)
    expect(clonedDate.getTime()).toBe(date.getTime())
    expect(clonedRegExp).not.toBe(regExp)
    expect(clonedRegExp.source).toBe(regExp.source)
    expect(clonedRegExp.flags).toBe(regExp.flags)
  })

  it('handles circular references', () => {
    const source: Record<string, unknown> = { name: 'x' }
    source.self = source

    const result = clone(source)

    expect(result).not.toBe(source)
    expect(result.self).toBe(result)
    expect(result).toStrictEqual(source)
  })

  it('clones symbol keys', () => {
    const sym = Symbol('k')
    const source = { [sym]: 1 }

    const result = clone(source)

    expect(result).not.toBe(source)
    expect(result[sym]).toBe(1)
  })
})
