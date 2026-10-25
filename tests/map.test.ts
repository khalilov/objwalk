import { describe, expect, expectTypeOf, it } from 'vitest'

import { map, type MapCallback, type MapOptions, type WalkKey } from '../src/index'

describe('map', () => {
  it('returns a transformed array without mutating the input', () => {
    const data = Object.freeze([1, 2, 3])
    const result = map(data, (_key, value) => value * 2)

    expectTypeOf(result).toEqualTypeOf<number[]>()
    expect(result).toEqual([2, 4, 6])
    expect(result).not.toBe(data)
    expect(data).toEqual([1, 2, 3])
  })

  it('returns a transformed dictionary with the same keys', () => {
    const data = Object.freeze({ first: 1, second: 2 })
    const result = map(data, (_key, value) => String(value))

    expectTypeOf(result).toEqualTypeOf<Record<string, string>>()
    expect(result).toEqual({ first: '1', second: '2' })
    expect(result).not.toBe(data)
    expect(data).toEqual({ first: 1, second: 2 })
  })

  it('transforms nested values before their containing objects and arrays', () => {
    const data = { users: [{ name: ' Ada ' }], label: ' team ' }
    const visited: string[] = []
    const result = map(data, (_key, value, path) => {
      visited.push(path)

      return typeof value === 'string' ? value.trim() : value
    })

    expect(result).toEqual({ users: [{ name: 'Ada' }], label: 'team' })
    expect(result.users).not.toBe(data.users)
    expect(result.users[0]).not.toBe(data.users[0])
    expect(data).toEqual({ users: [{ name: ' Ada ' }], label: ' team ' })
    expect(visited).toEqual(['users[0].name', 'users[0]', 'users', 'label'])
  })

  it.each([false, null, undefined])('stores callback return values without filtering or stopping: %s', (value) => {
    expect(map([1, 2], () => value)).toStrictEqual([value, value])
    expect(map({ a: 1, b: 2 }, () => value)).toStrictEqual({ a: value, b: value })
  })

  it('does not traverse callback replacements', () => {
    const result = map([1, 2], (_key, value) => ({ wrapped: value }))

    expect(result).toEqual([{ wrapped: 1 }, { wrapped: 2 }])
  })

  it('types shallow dictionary keys as strings without an accumulator', () => {
    const result = map({ editors: ['Ada'], readers: ['Grace', 'Lin'] }, (key, value, path) => {
      expectTypeOf(key).toEqualTypeOf<string>()
      expect(path).toBe(key)

      return Number(value.length)
    }, { shallow: true })

    expectTypeOf(result).toEqualTypeOf<Record<string, number>>()
    expect(result).toEqual({ editors: 1, readers: 2 })
  })

  it('types shallow readonly array keys as numbers', () => {
    const data: readonly unknown[] = [{ name: 'Ada' }, { name: 'Grace' }]
    const result = map(data, (key, value, path) => {
      expectTypeOf(key).toEqualTypeOf<number>()
      expect(path).toBe(`[${key}]`)

      return String(value.name)
    }, { shallow: true })

    expectTypeOf(result).toEqualTypeOf<string[]>()
    expect(result).toEqual(['Ada', 'Grace'])
  })

  it('keeps deep and dynamic traversal keys as WalkKey', () => {
    const options: MapOptions = { shallow: true }
    const callback: MapCallback<string> = (key) => {
      expectTypeOf(key).toEqualTypeOf<WalkKey>()

      return String(key)
    }

    expectTypeOf<MapCallback<string>>().returns.toEqualTypeOf<string>()
    map({ items: [1] }, (key, value) => {
      expectTypeOf(key).toEqualTypeOf<WalkKey>()

      return value
    })
    map({ items: [1] }, (key, value) => {
      expectTypeOf(key).toEqualTypeOf<WalkKey>()

      return value
    }, options)
    map({ items: [1] }, callback, { descend: ({ segments }) => segments.length === 0 })
  })

  it('prunes a container before mapping its original value as a whole', () => {
    const payload = Object.defineProperty({}, 'secret', {
      enumerable: true,
      get: () => {
        throw new Error('Must not traverse a handled container')
      },
    })
    const events: string[] = []
    const result = map({ payload, user: { name: ' Ada ' } }, (_key, value, path) => {
      events.push(`map:${path}`)

      if (path === 'payload') {
        expect(value).toBe(payload)

        return 'handled'
      }

      return typeof value === 'string' ? value.trim() : value
    }, {
      descend: ({ value, path }) => {
        events.push(`descend:${path}`)

        if (path === 'payload') {
          expect(value).toBe(payload)

          return false
        }

        return true
      },
    })

    expect(result).toEqual({ payload: 'handled', user: { name: 'Ada' } })
    expect(events).toEqual(['descend:', 'descend:payload', 'map:payload', 'descend:user', 'map:user.name', 'map:user'])
  })

  it.each([{ a: 1 }, [1]])('returns an empty container when descend prunes the root: %j', (data) => {
    const result = map(data, () => {
      throw new Error('Must not visit a pruned root')
    }, { descend: () => false })

    expect(result).toEqual(Array.isArray(data) ? [] : {})
    expect(result).not.toBe(data)
  })

  it('does not call descend below the shallow limit', () => {
    const data = { user: { name: 'Ada' } }
    const descended: string[] = []
    const result = map(data, (_key, value) => value, {
      shallow: true,
      descend: ({ path }) => {
        descended.push(path)

        return true
      },
    })

    expect(result).not.toBe(data)
    expect(result.user).toBe(data.user)
    expect(descended).toEqual([''])
  })

  it('supports cyclic branches when pruning prevents traversal', () => {
    const data: Record<string, unknown> = {}

    data.self = data

    expect(map(data, (key) => key, { shallow: true })).toEqual({ self: 'self' })
  })

  it('preserves array length and absent slots', () => {
    const data = Array<number>(3)
    const visited: WalkKey[] = []

    data[1] = 2

    const result = map(data, (key, value) => {
      visited.push(key)

      return value * 2
    })

    expect(result).toStrictEqual([, 4, ,])
    expect(result).toHaveLength(3)
    expect(Object.hasOwn(result, 0)).toBe(false)
    expect(Object.hasOwn(result, 2)).toBe(false)
    expect(visited).toEqual([1])
  })

  it('preserves literal keys without interpreting them as paths', () => {
    const data = Object.defineProperty({ 'a.b': 1, '': 2 }, '__proto__', {
      value: 3,
      enumerable: true,
    })
    const result = map(data, (_key, value) => value * 2)

    expect(Object.keys(result)).toEqual(['a.b', '', '__proto__'])
    expect(result['a.b']).toBe(2)
    expect(result['']).toBe(4)
    expect(Object.hasOwn(result, '__proto__')).toBe(true)
    expect(result['__proto__']).toBe(6)
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
  })

  it('maps own dictionary entries without copying its prototype', () => {
    const data: Record<string, number> = Object.assign(Object.create({ inherited: 3 }), { value: 2 })
    const result = map(data, (_key, value) => value * 2)

    expect(result).toEqual({ value: 4 })
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
  })

  it('maps each occurrence of a shared value into an independent result', () => {
    const value = { count: 1 }
    const result = map({ a: value, b: value }, (_key, value) => value)

    expect(result).toEqual({ a: { count: 1 }, b: { count: 1 } })
    expect(result.a).not.toBe(value)
    expect(result.b).not.toBe(result.a)
  })

  it('passes non-plain objects to the callback without replacing their internals', () => {
    const date = new Date(0)
    const regexp = /x/g
    const result = map({ date, regexp }, (_key, value) => value)

    expect(result.date).toBe(date)
    expect(result.regexp).toBe(regexp)
  })

  it.each([{}, []])('creates a new empty container of the input kind: %j', (data) => {
    const result = map(data, () => {
      throw new Error('Empty roots have no entries')
    })

    expect(result).toStrictEqual(data)
    expect(result).not.toBe(data)
  })

  it('propagates callback errors without assigning to the input', () => {
    const error = new Error('Cannot map')
    const data = Object.freeze({ a: 1, b: 2 })

    expect(() => map(data, () => { throw error })).toThrow(error)
    expect(data).toEqual({ a: 1, b: 2 })
  })

  it('propagates descend and getter errors', () => {
    const error = new Error('Cannot read')
    const data = Object.defineProperty({}, 'value', {
      enumerable: true,
      get: () => { throw error },
    })

    expect(() => map(data, (_key, value) => value)).toThrow(error)
    expect(() => map({ a: 1 }, (_key, value) => value, {
      descend: () => { throw error },
    })).toThrow(error)
  })
})
