import { describe, expect, it } from 'vitest'

import { flush } from '../src/index'

describe('flush', () => {
  it('deletes a nested property and returns the same object', () => {
    const data = { user: { name: 'Ada', role: 'admin' } }
    const result = flush(data, 'user.name')

    expect(result).toBe(data)
    expect(data).toEqual({ user: { role: 'admin' } })
    expect(Object.hasOwn(data.user, 'name')).toBe(false)
  })

  it('deletes root properties, including properties whose value is undefined', () => {
    const data = { name: undefined }

    flush(data, 'name')

    expect(Object.hasOwn(data, 'name')).toBe(false)
  })

  it.each([undefined, null, false, 0, '', 'Ada', 1n, Symbol('user')])(
    'leaves missing or non-object parents unchanged: %s',
    (user) => {
      const data = { user }

      expect(flush(data, 'user.profile.name')).toBe(data)
      expect(flush(data, 'user.name')).toBe(data)
      expect(data).toEqual({ user })
    }
  )

  it('does not create missing containers or prune empty parents', () => {
    const missing = {}
    const existing = { user: { profile: { name: 'Ada' } } }

    flush(missing, 'user.profile.name')
    flush(existing, 'user.profile.missing')
    flush(existing, 'user.profile.name')

    expect(missing).toEqual({})
    expect(existing).toEqual({ user: { profile: {} } })
  })

  it('deletes properties inside nested arrays', () => {
    const data = { groups: [{ items: [{ id: 'a', title: 'First' }] }] }

    flush(data, 'groups[0].items[0].title')

    expect(data).toEqual({ groups: [{ items: [{ id: 'a' }] }] })
  })

  it('deletes an array index without shifting items or changing length', () => {
    const data = { groups: [{ items: ['a', 'b', 'c'] }] }

    flush(data, 'groups[0].items[1]')

    expect(data.groups[0].items).toEqual(['a', , 'c'])
    expect(data.groups[0].items).toHaveLength(3)
    expect(Object.hasOwn(data.groups[0].items, 1)).toBe(false)
  })

  it('does not expand missing array indexes or replace non-array values', () => {
    const data = { items: [{ id: 'a' }], other: { 0: { id: 'b' } } }

    flush(data, 'items[99]')
    flush(data, 'items[99].id')
    flush(data, 'other[0]')
    flush(data, 'other[0].id')

    expect(data).toEqual({ items: [{ id: 'a' }], other: { 0: { id: 'b' } } })
  })

  it('does not traverse inherited properties or array indexes', () => {
    const prototype = { user: { name: 'Ada' }, items: [{ id: 'a' }] }
    const data = Object.create(prototype)
    const items = [{}]
    const inheritedIndex = { 0: { id: 'b' } }

    Object.setPrototypeOf(items, inheritedIndex)
    delete items[0]
    flush(data, 'user.name')
    flush(data, 'items[0]')
    flush({ items }, 'items[0].id')
    flush({ items }, 'items[0]')

    expect(prototype).toEqual({ user: { name: 'Ada' }, items: [{ id: 'a' }] })
    expect(inheritedIndex).toEqual({ 0: { id: 'b' } })
    expect(Object.hasOwn(data, 'user')).toBe(false)
  })

  it('does not traverse Object.prototype through special property names', () => {
    const data = {}

    flush(data, '__proto__.toString')
    flush(data, 'constructor.prototype.toString')

    expect(Object.hasOwn(Object.prototype, 'toString')).toBe(true)
    expect(data).toEqual({})
  })

  it('supports objects with a null prototype', () => {
    const data = Object.create(null)

    data.user = { name: 'Ada' }
    flush(data, 'user.name')

    expect(data.user).toEqual({})
  })

  it('leaves the object unchanged for an empty path', () => {
    const data = { '': 'keep', user: { name: 'Ada' } }

    expect(flush(data, '')).toBe(data)
    expect(data).toEqual({ '': 'keep', user: { name: 'Ada' } })
  })

  it('propagates errors when deleting non-configurable properties', () => {
    const data = { user: Object.defineProperty({}, 'name', { value: 'Ada' }) }

    expect(() => flush(data, 'user.name')).toThrow(TypeError)
    expect(data.user).toHaveProperty('name', 'Ada')
  })

  it('propagates errors from getters', () => {
    const error = new Error('Cannot read user')
    const data = Object.defineProperty({}, 'user', {
      get: () => {
        throw error
      },
    })

    expect(() => flush(data, 'user.name')).toThrow(error)
  })
})
