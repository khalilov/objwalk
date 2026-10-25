import { describe, expect, it } from 'vitest'

import { map } from '../src/map'
import { set } from '../src/set'

describe('map', () => {
  it('walks a root array and its nested objects', () => {
    const data = [{ name: ' Ada ' }, { name: ' Grace ' }]
    const result = map(data, (_key, value, store, path) => {
      if (typeof value === 'string') {
        store.names.push({ path, name: value.trim() })
      }
    }, { names: [] as Array<{ path: string; name: string }> })

    expect(result).toEqual({
      names: [{ path: '[0].name', name: 'Ada' }, { path: '[1].name', name: 'Grace' }],
    })
  })

  it.each([{ a: 1, b: 2 }, [1, 2]])('keeps ignoring callback results for objects and arrays: %s', (data) => {
    const result = map(data, (_key, value, store) => {
      store.values.push(value)

      return false
    }, { values: [] as number[] })

    expect(result.values).toEqual([1, 2])
  })

  it('walks data and returns the store built by callback', () => {
    const data = {
      user: { name: ' Ada ' },
      items: [{ title: ' First ' }, { title: ' Second ' }],
    }

    const result = map(data, (_key, value, store, path) => {
      if (typeof value === 'string') {
        set(store, path, value.trim())
      }
    })

    expect(result).toEqual({ user: { name: 'Ada' }, items: [{ title: 'First' }, { title: 'Second' }] })
  })

  it('uses a provided store object', () => {
    const store = { seen: [] as string[] }
    const result = map(
      { user: { name: 'Ada' } },
      (_key, value, currentStore, path) => {
        if (typeof value === 'string') {
          currentStore.seen.push(path)
        }
      },
      store
    )

    expect(result).toBe(store)
    expect(result).toEqual({ seen: ['user.name'] })
  })
})
