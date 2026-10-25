import { describe, expect, it } from 'vitest'

import { merge } from '../src/merge'

describe('merge', () => {
  it('ignores non-plain sources without traversing their contents', () => {
    const source = Object.defineProperty([], '0', {
      enumerable: true,
      get: () => {
        throw new Error('Must not traverse an ignored source')
      },
    })

    expect(merge({}, null, undefined, false, 0, 'text', source, { value: 1 })).toEqual({ value: 1 })
  })

  it('assigns replacement objects by reference without traversing them', () => {
    const value = Object.defineProperty({}, 'nested', {
      enumerable: true,
      get: () => {
        throw new Error('Must not traverse a replacement')
      },
    })
    const result = merge({ value: null }, { value })

    expect(result.value).toBe(value)
  })

  it('deeply merges plain objects and returns the same target', () => {
    const target = { user: { name: 'Ada', flags: { admin: false } } }

    const result = merge(target, { user: { email: 'ada@example.com', flags: { admin: true } } })

    expect(result).toBe(target)
    expect(result).toEqual({
      user: { name: 'Ada', email: 'ada@example.com', flags: { admin: true } },
    })
  })

  it('applies sources from left to right', () => {
    expect(merge({ value: 1 }, { value: 2, first: true }, { value: 3, last: true })).toEqual({
      value: 3,
      first: true,
      last: true,
    })
  })

  it('replaces arrays and non-plain objects', () => {
    const date = new Date('2026-01-01')
    const result = merge(
      { items: [{ id: 'a' }], metadata: { createdAt: new Date('2025-01-01') } },
      { items: [{ id: 'b' }], metadata: { createdAt: date } }
    )

    expect(result).toEqual({ items: [{ id: 'b' }], metadata: { createdAt: date } })
  })

  it('ignores unsafe property names', () => {
    const source = JSON.parse('{"safe":true,"__proto__":{"polluted":true}}')
    const result = merge({}, source)

    expect(result).toEqual({ safe: true })
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
  })
})
