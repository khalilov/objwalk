import { describe, expect, it } from 'vitest'

import { map } from '../map'
import { set } from '../set'

describe('map', () => {
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
