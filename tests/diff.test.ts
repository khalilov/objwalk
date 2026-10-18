import { describe, expect, it } from 'vitest'

import { diff, type DiffOperation } from '../src/index'

describe('diff', () => {
  it('reports nested changes and deletions in traversal order', () => {
    const first = { hp: 10, target: 'enemy', position: { x: 1, y: 2 } }
    const last = { hp: null, position: { x: 3, y: 2 } }
    const operations: DiffOperation[] = diff(first, last)

    expect(operations).toEqual([
      { type: 'set', path: ['hp'], value: null },
      { type: 'set', path: ['position', 'x'], value: 3 },
      { type: 'delete', path: ['target'] },
    ])
  })

  it('returns no operations for equal nested values', () => {
    expect(diff({ user: { items: [1, 2], value: NaN } }, { user: { items: [1, 2], value: NaN } })).toEqual([])
  })

  it('finishes nested removals before visiting siblings and parent removals', () => {
    const first = {
      a: { deep: { keep: 1, removed: 2 }, removed: 3 },
      b: { keep: 1, removed: 4 },
      removed: 5,
    }
    const last = { a: { deep: { keep: 2 } }, b: { keep: 2 } }

    expect(diff(first, last)).toEqual([
      { type: 'set', path: ['a', 'deep', 'keep'], value: 2 },
      { type: 'delete', path: ['a', 'deep', 'removed'] },
      { type: 'delete', path: ['a', 'removed'] },
      { type: 'set', path: ['b', 'keep'], value: 2 },
      { type: 'delete', path: ['b', 'removed'] },
      { type: 'delete', path: ['removed'] },
    ])
  })

  it('does not read getters on removed properties', () => {
    const first = Object.defineProperty({}, 'removed', {
      enumerable: true,
      get: () => {
        throw new Error('Must not read removed values')
      },
    })

    expect(diff(first, {})).toEqual([{ type: 'delete', path: ['removed'] }])
  })

  it('does not read a hidden getter when setting an enumerable property', () => {
    const first = Object.defineProperty({}, 'value', {
      get: () => {
        throw new Error('Must not read hidden values')
      },
    })

    expect(diff(first, { value: 1 })).toEqual([{ type: 'set', path: ['value'], value: 1 }])
  })

  it('does not traverse a newly added object', () => {
    const last = Object.defineProperty({}, 'value', {
      enumerable: true,
      get: () => {
        throw new Error('Must not traverse a replacement')
      },
    })
    const operations = diff(undefined, last)

    expect(operations).toHaveLength(1)
    expect(operations[0].path).toEqual([])
    expect(operations[0].type === 'set' && operations[0].value).toBe(last)
  })

  it('distinguishes deletion, null, and an own undefined value', () => {
    expect(diff({ a: 1 }, {})).toEqual([{ type: 'delete', path: ['a'] }])
    expect(diff({ a: 1 }, { a: null })).toEqual([{ type: 'set', path: ['a'], value: null }])
    expect(diff({ a: 1 }, { a: undefined })).toEqual([{ type: 'set', path: ['a'], value: undefined }])
    expect(diff({}, { a: undefined })).toEqual([{ type: 'set', path: ['a'], value: undefined }])
    expect(diff({ a: undefined }, {})).toEqual([{ type: 'delete', path: ['a'] }])
    expect(diff({ a: undefined }, { a: undefined })).toEqual([])
  })

  it.each([null, undefined, false, 0, '', NaN, 1n])('replaces a changed root with %s', (last) => {
    expect(diff({ a: 1 }, last)).toEqual([{ type: 'set', path: [], value: last }])
    expect(diff(last, last)).toEqual([])
  })

  it('sets new objects, including empty ones, as whole values', () => {
    const last = { user: { name: 'Ada' }, empty: {} }

    expect(diff({}, last)).toEqual([
      { type: 'set', path: ['user'], value: last.user },
      { type: 'set', path: ['empty'], value: last.empty },
    ])
    expect(diff(undefined, last)).toEqual([{ type: 'set', path: [], value: last }])
  })

  it('replaces a scalar with an object without splitting the new value', () => {
    expect(diff({ user: 1 }, { user: { name: 'Ada' } })).toEqual([
      { type: 'set', path: ['user'], value: { name: 'Ada' } },
    ])
  })

  it('keeps empty parent objects when their last key is removed', () => {
    expect(diff({ user: { name: 'Ada' } }, { user: {} })).toEqual([
      { type: 'delete', path: ['user', 'name'] },
    ])
  })

  it('compares arrays deeply and replaces changed arrays as whole values', () => {
    const last = { items: [{ id: 'b' }] }
    const operations = diff({ items: [{ id: 'a' }] }, last)

    expect(operations).toEqual([{ type: 'set', path: ['items'], value: last.items }])
    expect(diff([1, 2], [1, 3])).toEqual([{ type: 'set', path: [], value: [1, 3] }])
  })

  it('compares Date and RegExp values with equally', () => {
    const first = { date: new Date('2026-01-01'), pattern: /a/g }
    const same = { date: new Date('2026-01-01'), pattern: /a/g }
    const last = { date: new Date('2026-01-02'), pattern: /a/i }

    expect(diff(first, same)).toEqual([])
    expect(diff(first, last)).toEqual([
      { type: 'set', path: ['date'], value: last.date },
      { type: 'set', path: ['pattern'], value: last.pattern },
    ])
  })

  it('keeps dots, brackets, and empty keys as literal path segments', () => {
    expect(diff({ 'a.b': { '[0]': 1 }, '': 1 }, { 'a.b': { '[0]': 2 }, '': 2 })).toEqual([
      { type: 'set', path: ['a.b', '[0]'], value: 2 },
      { type: 'set', path: [''], value: 2 },
    ])
  })

  it('handles own keys that also exist on Object.prototype', () => {
    expect(diff({}, { toString: undefined, constructor: null })).toEqual([
      { type: 'set', path: ['toString'], value: undefined },
      { type: 'set', path: ['constructor'], value: null },
    ])
    expect(diff({ toString: undefined }, {})).toEqual([{ type: 'delete', path: ['toString'] }])
  })

  it('supports null-prototype objects without invoking own lookup methods', () => {
    const first = Object.create(null)
    const last = Object.create(null)

    first.value = 1
    last.value = 2
    last.propertyIsEnumerable = null

    expect(diff(first, last)).toEqual([
      { type: 'set', path: ['value'], value: 2 },
      { type: 'set', path: ['propertyIsEnumerable'], value: null },
    ])
  })

  it('ignores symbol and non-enumerable keys on plain objects', () => {
    const key = Symbol('key')
    const first = Object.defineProperty({ [key]: 1 }, 'hidden', { value: 1 })
    const last = Object.defineProperty({ [key]: 2 }, 'hidden', { value: 2 })

    expect(diff(first, last)).toEqual([])
  })

  it('treats only enumerable keys as present when visibility changes', () => {
    const hidden = Object.defineProperty({}, 'a', { value: 1 })

    expect(diff(hidden, { a: 1 })).toEqual([{ type: 'set', path: ['a'], value: 1 }])
    expect(diff({ a: 1 }, hidden)).toEqual([{ type: 'delete', path: ['a'] }])
  })

  it('does not mutate frozen inputs and keeps set values by reference', () => {
    const first = Object.freeze({ user: Object.freeze({ name: 'Ada' }) })
    const last = Object.freeze({ user: Object.freeze({ name: 'Grace' }), items: Object.freeze([1, 2]) })
    const operations = diff(first, last)

    expect(operations).toEqual([
      { type: 'set', path: ['user', 'name'], value: 'Grace' },
      { type: 'set', path: ['items'], value: last.items },
    ])
    expect(operations[1].type === 'set' && operations[1].value).toBe(last.items)
    expect(first.user.name).toBe('Ada')
    expect(last.user.name).toBe('Grace')
  })

  it('visits shared references at each path without treating them as cycles', () => {
    const first = { value: 1 }
    const last = { value: 2 }

    expect(diff({ a: first, b: first }, { a: last, b: last })).toEqual([
      { type: 'set', path: ['a', 'value'], value: 2 },
      { type: 'set', path: ['b', 'value'], value: 2 },
    ])
  })

  it('reports special own keys without modifying prototypes', () => {
    const last = JSON.parse('{"__proto__":{"polluted":true}}')

    expect(diff({}, last)).toEqual([{ type: 'set', path: ['__proto__'], value: { polluted: true } }])
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false)
  })

  it('propagates errors from enumerable getters', () => {
    const error = new Error('Cannot read value')
    const last = Object.defineProperty({}, 'value', {
      enumerable: true,
      get: () => {
        throw error
      },
    })

    expect(() => diff({}, last)).toThrow(error)
  })
})
