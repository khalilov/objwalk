import { describe, expect, expectTypeOf, it } from 'vitest'

import { equally } from '../src/index'

describe('equally', () => {
  it('exports the optional path-list signature', () => {
    expectTypeOf(equally).parameters.toEqualTypeOf<[a: unknown, b: unknown, paths?: string[]]>()
    expectTypeOf(equally).returns.toEqualTypeOf<boolean>()
  })

  it('does not read unselected properties', () => {
    const a = Object.defineProperty({ value: 1 }, 'other', {
      enumerable: true,
      get: () => {
        throw new Error('Must not read an unselected property')
      },
    })

    expect(equally(a, { value: 1 }, ['value'])).toBe(true)
    expect(equally(a, {}, [])).toBe(true)
  })

  it('does not read later paths after the first mismatch', () => {
    const a = Object.defineProperty({ value: 1 }, 'later', {
      get: () => {
        throw new Error('Must not read after a mismatch')
      },
    })

    expect(equally(a, { value: 2 }, ['value', 'later'])).toBe(false)
  })

  it('compares only the selected paths and requires every path to match', () => {
    const a = { user: { name: 'Ada', role: 'admin' }, items: [{ id: 1 }], ignored: 'a' }
    const b = { user: { name: 'Ada', role: 'guest' }, items: [{ id: 1 }], ignored: 'b' }
    const paths = ['user.name', 'items[0]']

    expect(equally(a, b, paths)).toBe(true)
    expect(equally(a, b, ['user.name', 'user.role'])).toBe(false)
    expect(equally(a, b, undefined)).toBe(false)
    expect(paths).toEqual(['user.name', 'items[0]'])
    expect(a.ignored).toBe('a')
    expect(b.ignored).toBe('b')
  })

  it('returns true for an empty path list', () => {
    expect(equally({ a: 1 }, { a: 2 }, [])).toBe(true)
    expect(equally(null, undefined, [])).toBe(true)
  })

  it('compares unresolved paths as undefined and preserves falsy values', () => {
    expect(equally({}, { user: { name: undefined } }, ['user.name'])).toBe(true)
    expect(equally(null, { user: null }, ['user.name'])).toBe(true)
    expect(equally({}, { user: { name: 'Ada' } }, ['user.name'])).toBe(false)
    expect(equally({ value: null }, {}, ['value'])).toBe(false)
    expect(equally({ value: false }, { value: 0 }, ['value'])).toBe(false)
    expect(equally({ value: '' }, {}, ['value'])).toBe(false)
  })

  it('uses an empty path to compare the whole value', () => {
    expect(equally({ a: 1 }, { a: 1 }, [''])).toBe(true)
    expect(equally({ a: 1 }, { a: 2 }, [''])).toBe(false)
  })

  it('reads inherited properties using the existing path semantics', () => {
    const a = Object.create({ user: { name: 'Ada' } })

    expect(equally(a, { user: { name: 'Ada' } }, ['user.name'])).toBe(true)
  })

  it('preserves deep comparison semantics for selected values', () => {
    const a: Record<string, unknown> = { date: new Date('2026-01-01'), regexp: /ab+/g, nan: NaN }
    const b: Record<string, unknown> = { date: new Date('2026-01-01'), regexp: /ab+/g, nan: NaN }

    a.self = a
    b.self = b

    expect(equally(a, b, ['date', 'regexp', 'nan', 'self'])).toBe(true)

    b.date = new Date('2026-01-02')

    expect(equally(a, b, ['date'])).toBe(false)
  })

  it('propagates errors from selected path getters', () => {
    const error = new Error('Cannot read user')
    const a = Object.defineProperty({}, 'user', {
      get: () => {
        throw error
      },
    })

    expect(() => equally(a, {}, ['user.name'])).toThrow(error)
  })

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

  it('distinguishes a Date from an empty plain object in either argument order', () => {
    expect(equally(new Date(0), {})).toBe(false)
    expect(equally({}, new Date(0))).toBe(false)
    expect(equally({ value: new Date(0) }, { value: {} }, ['value'])).toBe(false)
  })

  it('distinguishes a RegExp from an object with matching own properties', () => {
    const object = Object.defineProperty({}, 'lastIndex', { value: 0 })

    expect(equally(/x/, object)).toBe(false)
    expect(equally(object, /x/)).toBe(false)
    expect(equally(new Date(0), /x/)).toBe(false)
    expect(equally(/x/, new Date(0))).toBe(false)
  })

  it('rejects differing sparse arrays in either argument order', () => {
    const sparse = Array<unknown>(1)

    expect(equally([1], sparse)).toBe(false)
    expect(equally(sparse, [1])).toBe(false)
    expect(equally({ items: sparse }, { items: [1] }, ['items'])).toBe(false)
  })

  it('compares holes as undefined and preserves array length checks', () => {
    const sparse = Array<unknown>(1)

    expect(equally(sparse, [undefined])).toBe(true)
    expect(equally([undefined], sparse)).toBe(true)
    expect(equally(sparse, Array<unknown>(1))).toBe(true)
    expect(equally(sparse, [])).toBe(false)
    expect(equally([], sparse)).toBe(false)
  })

  it('handles circular sparse arrays', () => {
    const a = Array<unknown>(2)
    const b = Array<unknown>(2)

    a[1] = a
    b[1] = b

    expect(equally(a, b)).toBe(true)
  })

  it('reads matching array values once', () => {
    const reads: string[] = []
    const a = [1]
    const b = [1]

    Object.defineProperty(a, '0', {
      get: () => {
        reads.push('a')

        return 1
      },
    })
    Object.defineProperty(b, '0', {
      get: () => {
        reads.push('b')

        return 1
      },
    })

    expect(equally(a, b)).toBe(true)
    expect(reads).toEqual(['a', 'b'])
  })

  it('stops reading array values at the first mismatch', () => {
    const reads: number[] = []
    const a = [1, 2]

    Object.defineProperty(a, '0', {
      get: () => {
        reads.push(0)

        return 1
      },
    })
    Object.defineProperty(a, '1', {
      get: () => {
        throw new Error('Must not read after a mismatch')
      },
    })

    expect(equally(a, [2, 2])).toBe(false)
    expect(reads).toEqual([0])
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
