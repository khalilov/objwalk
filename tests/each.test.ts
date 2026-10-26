import { describe, expect, expectTypeOf, it } from 'vitest'

import { each, type EachCallback, type EachEntry, type EachOptions, type WalkKey } from '../src/index'

describe('each', () => {
  it('types shallow dictionary entries and does not read their nested values', () => {
    const branch = Object.defineProperty({ count: 1 }, 'nested', {
      enumerable: true,
      get: () => { throw new Error('Must not descend into a shallow entry') },
    })
    const data: Record<string, { count: number }> = { first: branch, second: { count: 2 } }
    const visits: Array<[string, number]> = []

    each(data, (key, value, path, segments) => {
      expectTypeOf(key).toEqualTypeOf<string>()
      expectTypeOf(value).toEqualTypeOf<{ count: number }>()
      expect(path).toBe(key)
      expect(segments).toEqual([key])
      visits.push([key, value.count])
    }, { shallow: true })

    expect(visits).toEqual([['first', 1], ['second', 2]])
  })

  it('types shallow readonly array entries without visiting their children', () => {
    const data: readonly { count: number }[] = [{ count: 1 }, { count: 2 }]
    const visits: number[] = []

    each(data, (key, value, path, segments) => {
      expectTypeOf(key).toEqualTypeOf<number>()
      expectTypeOf(value).toEqualTypeOf<{ count: number }>()
      expect(path).toBe(`[${key}]`)
      expect(segments).toEqual([key])
      visits.push(value.count)
    }, { shallow: true })

    expect(visits).toEqual([1, 2])
  })

  it('includes the dictionary root in shallow key and value types', () => {
    const data: Record<string, { count: number }> = { first: { count: 1 } }
    const paths: string[] = []

    each(data, (key, value, path) => {
      expectTypeOf(key).toEqualTypeOf<string | undefined>()
      expectTypeOf(value).toEqualTypeOf<typeof data | { count: number }>()
      paths.push(path)
    }, { shallow: true, root: true })

    expect(paths).toEqual(['', 'first'])
  })

  it('includes a readonly array root in shallow key and value types', () => {
    const data: readonly number[] = [1, 2]
    const paths: string[] = []

    each(data, (key, value, path) => {
      expectTypeOf(key).toEqualTypeOf<number | undefined>()
      expectTypeOf(value).toEqualTypeOf<number | typeof data>()
      paths.push(path)
    }, { shallow: true, root: true })

    expect(paths).toEqual(['', '[0]', '[1]'])
  })

  it('keeps root unions for a dynamic root flag with literal shallow mode', () => {
    const data = { count: 1 }
    const options: EachOptions & { shallow: true } = { shallow: true, root: true }

    each(data, (key, value) => {
      expectTypeOf(key).toEqualTypeOf<string | undefined>()
      expectTypeOf(value).toEqualTypeOf<number | typeof data>()
    }, options)
  })

  it('keeps dynamic-depth and unknown-input callbacks general', () => {
    const options: EachOptions & { root: false } = { root: false, shallow: true }
    const data: unknown = { count: 1 }

    each({ items: [1] }, (key, value) => {
      expectTypeOf(key).toEqualTypeOf<WalkKey>()
      expectTypeOf(value).toBeAny()
    }, options)
    each(data, (key, value) => {
      expectTypeOf(key).toEqualTypeOf<WalkKey>()
      expectTypeOf(value).toBeAny()
    }, { shallow: true })
  })

  it('supports explicitly typed shallow callbacks and heterogeneous tuples', () => {
    const callback: EachCallback<string, { count: number }> = (_key, value) => {
      expect(value.count).toBe(1)
    }
    const data: readonly [number, string] = [1, 'Ada']

    each({ first: { count: 1 } }, callback, { shallow: true })
    each(data, (_key, value) => {
      expectTypeOf(value).toEqualTypeOf<number | string>()
    }, { shallow: true })
  })

  it('preserves unknown value types for shallow typed containers', () => {
    const dictionary: Record<string, unknown> = { first: 1 }
    const array: readonly unknown[] = [1]

    each(dictionary, (_key, value) => {
      expectTypeOf(value).toBeUnknown()
    }, { shallow: true })
    each(array, (_key, value) => {
      expectTypeOf(value).toBeUnknown()
    }, { shallow: true })
  })

  it('infers the value union for dictionaries with different key sets', () => {
    const records: Array<{ count: number } | { name: string }> = [{ count: 1 }, { name: 'Ada' }]

    records.forEach((data) => {
      each(data, (key, value) => {
        expectTypeOf(key).toEqualTypeOf<string>()
        expectTypeOf(value).toEqualTypeOf<number | string>()
      }, { shallow: true })
    })
  })

  it('evaluates descend only at the shallow root after its callback', () => {
    const events: string[] = []

    each({ child: { nested: 1 } }, (_key, _value, path) => {
      events.push(`visit:${path}`)
    }, {
      shallow: true,
      root: true,
      descend: ({ path }) => {
        events.push(`descend:${path}`)

        return true
      },
    })

    expect(events).toEqual(['visit:', 'descend:', 'visit:child'])
  })

  it.each([{ first: 1 }, [1]])('stops a shallow traversal before subsequent getters: %j', (data) => {
    const visits: WalkKey[] = []

    Object.defineProperty(data, Array.isArray(data) ? '1' : 'later', {
      enumerable: true,
      get: () => { throw new Error('Must stop before reading the next entry') },
    })
    each(data, (key) => {
      visits.push(key)

      return false
    }, { shallow: true })

    expect(visits).toEqual([Array.isArray(data) ? 0 : 'first'])
  })

  it('prunes the shallow root and preserves stopping at an included root', () => {
    const visits: string[] = []

    each({ first: 1 }, (_key, _value, path) => {
      visits.push(path)
    }, { shallow: true, root: true, descend: () => false })
    each({ first: 1 }, () => false, {
      shallow: true,
      root: true,
      descend: () => { throw new Error('Must stop before descend') },
    })

    expect(visits).toEqual([''])
  })

  it('allows cyclic values in shallow dictionaries and skips array holes', () => {
    const dictionary: Record<string, unknown> = {}
    const array = Array<number>(3)
    const keys: WalkKey[] = []

    dictionary.self = dictionary
    array[1] = 2
    each(dictionary, (key) => { keys.push(key) }, { shallow: true })
    each(array, (key) => { keys.push(key) }, { shallow: true })

    expect(keys).toEqual(['self', 1])
  })

  it('walks nested objects and arrays with path information', () => {
    const data = {
      user: { name: 'Ada' },
      items: [{ title: 'First' }, { title: 'Second' }],
      active: true,
    }
    const visited: Array<[string | number, any, string]> = []

    each(data, (key, value, path) => {
      visited.push([key, value, path])
    })

    expect(visited.map((item) => item[2])).toEqual([
      'user',
      'user.name',
      'items',
      'items[0]',
      'items[0].title',
      'items[1]',
      'items[1].title',
      'active',
    ])
    expect(visited.find((item) => item[2] === 'items[0]')?.[0]).toBe(0)
  })

  it('walks a root array', () => {
    const visited: string[] = []

    each([{ id: 'a' }], (_key, _value, path) => {
      visited.push(path)
    })

    expect(visited).toEqual(['[0]', '[0].id'])
  })

  it('does not call callback for primitive root values', () => {
    const visited: string[] = []

    each('Ada', (_key, _value, path) => {
      visited.push(path)
    })

    expect(visited).toEqual([])
  })

  it('provides literal segments for dotted, bracketed, empty, and array keys', () => {
    const data = { 'a.b': 1, a: { b: 2 }, '[0]': 3, '': { child: 4 }, items: [{ id: 5 }] }
    const visited: WalkKey[][] = []

    each(data, (_key, _value, _path, segments) => {
      visited.push(segments)
    })

    expect(visited).toEqual([
      ['a.b'], ['a'], ['a', 'b'], ['[0]'], [''], ['', 'child'],
      ['items'], ['items', 0], ['items', 0, 'id'],
    ])
  })

  it('visits the root before its children when root is true', () => {
    const data = { user: { name: 'Ada' } }
    const visited: EachEntry[] = []

    each(data, (key, value, path, segments) => {
      expectTypeOf(key).toEqualTypeOf<WalkKey | undefined>()
      visited.push({ key, value, path, segments })
    }, { root: true })

    expect(visited).toEqual([
      { key: undefined, value: data, path: '', segments: [] },
      { key: 'user', value: data.user, path: 'user', segments: ['user'] },
      { key: 'name', value: 'Ada', path: 'user.name', segments: ['user', 'name'] },
    ])
  })

  it.each([null, undefined, false, 0, '', 'Ada', [], {}])('visits a root value: %s', (data) => {
    const visited: EachEntry[] = []

    each(data, (key, value, path, segments) => {
      visited.push({ key, value, path, segments })
    }, { root: true })

    expect(visited).toEqual([{ key: undefined, value: data, path: '', segments: [] }])
  })

  it('keeps legacy callback and key types when root is absent or false', () => {
    const visited: WalkKey[] = []
    const callback: EachCallback = (key) => {
      visited.push(key)
    }

    each({ a: 1 }, callback)
    each({ b: 2 }, (key) => {
      expectTypeOf(key).toEqualTypeOf<WalkKey>()
      visited.push(key)
    }, { root: false })
    each({ c: 3 }, (key) => {
      expectTypeOf(key).toEqualTypeOf<WalkKey>()
      visited.push(key)
    }, { descend: () => true })

    expect(visited).toEqual(['a', 'b', 'c'])
  })

  it('types a dynamic root option safely', () => {
    const options: EachOptions = { root: true }
    const visited: Array<WalkKey | undefined> = []

    each({ a: 1 }, (key) => {
      expectTypeOf(key).toEqualTypeOf<WalkKey | undefined>()
      visited.push(key)
    }, options)

    expect(visited).toEqual([undefined, 'a'])
  })

  it('visits arrays but skips their contents when descend returns false', () => {
    const data = { items: [{ id: 1 }], user: { name: 'Ada' } }
    const visited: string[] = []

    each(data, (_key, _value, path) => {
      visited.push(path)
    }, {
      descend: ({ value }) => Array.isArray(value) === false,
    })

    expect(visited).toEqual(['items', 'user', 'user.name'])
  })

  it('evaluates descend after visiting a container and never for leaves', () => {
    const events: string[] = []

    each({ a: { value: 1 } }, (_key, _value, path) => {
      events.push(`visit:${path}`)
    }, {
      root: true,
      descend: ({ path }) => {
        events.push(`descend:${path}`)
        return true
      },
    })

    expect(events).toEqual(['visit:', 'descend:', 'visit:a', 'descend:a', 'visit:a.value'])
  })

  it('allows descend to skip a root without visiting its children', () => {
    const visited: string[] = []

    each({ a: { value: 1 } }, (_key, _value, path) => {
      visited.push(path)
    }, { root: true, descend: () => false })

    expect(visited).toEqual([''])
    each({ a: 1 }, (_key, _value, path) => {
      visited.push(path)
    }, { descend: () => false })
    expect(visited).toEqual([''])
  })

  it('passes literal segments and the original container to descend', () => {
    const data = { 'a.b': { value: 1 } }
    const visited: EachEntry[] = []

    each(data, () => {}, {
      descend: ({ key, value, path, segments }) => {
        visited.push({ key, value, path, segments })
        return true
      },
    })

    expect(visited).toEqual([
      { key: undefined, value: data, path: '', segments: [] },
      { key: 'a.b', value: data['a.b'], path: 'a.b', segments: ['a.b'] },
    ])
    expect(visited[0].value).toBe(data)
  })

  it('does not evaluate getters inside a pruned container', () => {
    const branch = Object.defineProperty({}, 'value', {
      enumerable: true,
      get: () => {
        throw new Error('Must not visit')
      },
    })
    const visited: string[] = []

    each({ branch }, (_key, _value, path) => {
      visited.push(path)
    }, { descend: ({ segments }) => segments.length === 0 })

    expect(visited).toEqual(['branch'])
  })

  it('stops the entire traversal when a nested object callback returns false', () => {
    const visited: string[] = []

    each({ a: { b: 1, c: 2 }, d: 3 }, (_key, _value, path) => {
      visited.push(path)

      return path === 'a.b' ? false : undefined
    })

    expect(visited).toEqual(['a', 'a.b'])
  })

  it('stops the entire traversal from inside nested arrays', () => {
    const visited: string[] = []

    each([{ items: [1, 2] }, { items: [3] }], (_key, _value, path) => {
      visited.push(path)

      return path === '[0].items[0]' ? false : undefined
    })

    expect(visited).toEqual(['[0]', '[0].items', '[0].items[0]'])
  })

  it.each([{ a: 1 }, [1], 1, null])('stops at an included root: %s', (data) => {
    const visited: string[] = []
    const descended: string[] = []

    each(data, (_key, _value, path) => {
      visited.push(path)

      return false
    }, {
      root: true,
      descend: ({ path }) => {
        descended.push(path)

        return true
      },
    })

    expect(visited).toEqual([''])
    expect(descended).toEqual([])
  })

  it('does not descend into a stopped container or visit its siblings', () => {
    const visited: string[] = []
    const descended: string[] = []

    each({ a: { b: 1 }, c: 2 }, (_key, _value, path) => {
      visited.push(path)

      return false
    }, {
      descend: ({ path }) => {
        descended.push(path)

        return true
      },
    })

    expect(visited).toEqual(['a'])
    expect(descended).toEqual([''])
  })

  it.each([true, undefined, null, 0, '', 1])('continues for callback results other than false: %s', (result) => {
    const visited: string[] = []
    const callback: EachCallback = (_key, _value, path) => {
      visited.push(path)

      return result
    }

    each({ a: { b: 1 } }, callback)

    expect(visited).toEqual(['a', 'a.b'])
  })

  it.each([{ first: 1 }, [1]])('does not read subsequent getters after stopping: %s', (data) => {
    const visited: string[] = []

    Object.defineProperty(data, Array.isArray(data) ? '1' : 'later', {
      enumerable: true,
      get: () => {
        throw new Error('Must not read after stopping')
      },
    })
    each(data, (_key, _value, path) => {
      visited.push(path)

      return false
    })

    expect(visited).toHaveLength(1)
  })

  it('propagates callback errors', () => {
    const error = new Error('Cannot visit')

    expect(() => each({ a: 1 }, () => {
      throw error
    })).toThrow(error)
  })

  it('keeps nested and subsequent traversals independent after stopping', () => {
    const visited: string[] = []

    each({ a: 1, b: 2 }, (_key, _value, path) => {
      each([1, 2], () => false)
      visited.push(path)
    })
    each({ c: 3 }, (_key, _value, path) => {
      visited.push(path)
    })

    expect(visited).toEqual(['a', 'b', 'c'])
  })

  it.each([{}, []])('propagates errors when reading a visited value: %s', (data) => {
    const error = new Error('Cannot read value')

    Object.defineProperty(data, Array.isArray(data) ? '0' : 'value', {
      enumerable: true,
      get: () => {
        throw error
      },
    })

    expect(() => each(data, () => {})).toThrow(error)
  })

  it('returns undefined after completion or early stopping', () => {
    expectTypeOf(each).returns.toEqualTypeOf<void>()
    expect(each({ a: 1 }, () => {})).toBeUndefined()
    expect(each([1, 2], () => false)).toBeUndefined()
  })

  it('keeps traversal paths intact when consumers mutate received segments', () => {
    const visited: WalkKey[][] = []

    each({ a: { b: 1 } }, (_key, _value, _path, segments) => {
      visited.push([...segments])
      segments.push('callback')
    }, {
      descend: ({ segments }) => {
        segments.push('descend')
        return true
      },
    })

    expect(visited).toEqual([['a'], ['a', 'b']])
  })

  it('propagates descend errors', () => {
    const error = new Error('Cannot descend')

    expect(() => each({}, () => {}, {
      descend: () => {
        throw error
      },
    })).toThrow(error)
  })
})
