import { describe, expect, it } from 'vitest'

import { equally } from '../src/equally'

describe('equally', () => {
  it('treats NaN as equal to NaN', () => {
    expect(equally(NaN, NaN)).toBe(true)
    expect(equally(NaN, 1)).toBe(false)
  })

  it('compares primitives by value', () => {
    expect(equally(1, 1)).toBe(true)
    expect(equally('a', 'a')).toBe(true)
    expect(equally(1, '1')).toBe(false)
    expect(equally(null, null)).toBe(true)
    expect(equally(null, undefined)).toBe(false)
  })

  it('compares nested objects', () => {
    expect(equally({ a: { b: [1, 2] } }, { a: { b: [1, 2] } })).toBe(true)
    expect(equally({ a: { b: [1, 2] } }, { a: { b: [1, 3] } })).toBe(false)
    expect(equally({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })

  it('compares arrays', () => {
    expect(equally([1, [2, 3]], [1, [2, 3]])).toBe(true)
    expect(equally([1, 2], [1, 2, 3])).toBe(false)
    expect(equally([1, 2], { 0: 1, 1: 2 })).toBe(false)
  })

  it('compares Date and RegExp', () => {
    expect(equally(new Date('2026-01-01'), new Date('2026-01-01'))).toBe(true)
    expect(equally(new Date('2026-01-01'), new Date('2026-01-02'))).toBe(false)
    expect(equally(/ab+/g, /ab+/g)).toBe(true)
    expect(equally(/ab+/g, /ab+/i)).toBe(false)
  })

  it('handles circular references', () => {
    const a: Record<string, unknown> = { name: 'x' }
    const b: Record<string, unknown> = { name: 'x' }
    a.self = a
    b.self = b

    expect(equally(a, b)).toBe(true)

    b.name = 'y'
    expect(equally(a, b)).toBe(false)
  })

  it('compares symbol keys', () => {
    const sym = Symbol('k')
    expect(equally({ [sym]: 1 }, { [sym]: 1 })).toBe(true)
    expect(equally({ [sym]: 1 }, { [Symbol('k')]: 1 })).toBe(false)
  })
})
