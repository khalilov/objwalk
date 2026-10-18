import { describe, expect, expectTypeOf, it } from 'vitest'

import { each, type EachCallback, type EachEntry, type EachOptions, type WalkKey } from '../src/index'

describe('each', () => {
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

  it('ignores callback return values', () => {
    const visited: string[] = []

    each({ a: { b: 1 } }, (_key, _value, path) => {
      visited.push(path)
      return false
    })

    expect(visited).toEqual(['a', 'a.b'])
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
