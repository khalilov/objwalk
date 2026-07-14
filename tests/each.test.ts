import { describe, expect, it } from 'vitest'

import { each } from '../src/each'

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
})
