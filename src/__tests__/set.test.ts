import { describe, expect, it } from 'vitest'

import { set } from '../set'

describe('set', () => {
  it('sets a nested object value and returns the same object', () => {
    const data = {}
    const result = set(data, 'user.name', 'Ada')

    expect(result).toBe(data)
    expect(result).toEqual({ user: { name: 'Ada' } })
  })

  it('sets an array item by index', () => {
    const data = {}

    set(data, 'items[0].title', 'First')

    expect(data).toEqual({ items: [{ title: 'First' }] })
  })

  it('expands arrays when setting a later index', () => {
    const data = {}

    set(data, 'items[1].name', 'second')

    expect(data).toEqual({ items: [, { name: 'second' }] })
  })

  it('overwrites a non-object intermediate value', () => {
    const data = { user: 'Ada' as any }

    set(data, 'user.name', 'Ada')

    expect(data).toEqual({ user: { name: 'Ada' } })
  })

  it('replaces an existing non-array value when an array segment is needed', () => {
    const data = { items: {} as any }

    set(data, 'items[0].id', 'a')

    expect(data).toEqual({ items: [{ id: 'a' }] })
  })
})
