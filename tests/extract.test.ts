import { describe, expect, it } from 'vitest'

import { extract } from '../src/extract'

describe('extract', () => {
  it('maps destination paths to source paths', () => {
    const result = extract(
      { profile: { fullName: 'Ada Lovelace', email: 'ada@example.com' } },
      {
        'user.name': 'profile.fullName',
        'user.email': 'profile.email',
      }
    )

    expect(result).toEqual({ user: { name: 'Ada Lovelace', email: 'ada@example.com' } })
  })

  it('uses the first resolved fallback source path', () => {
    const result = extract(
      { profile: { fullName: 'Ada Lovelace' } },
      {
        'user.name': ['profile.displayName', 'profile.fullName'],
      }
    )

    expect(result).toEqual({ user: { name: 'Ada Lovelace' } })
  })

  it('leaves fallback destination unset when no source path resolves', () => {
    const result = extract(
      { profile: {} },
      {
        'user.name': ['profile.displayName', 'profile.fullName'],
      }
    )

    expect(result).toEqual({})
  })

  it('skips holes in fallback path lists', () => {
    const paths = ['missing', 'value']

    delete paths[0]

    expect(extract({ value: 1 }, { selected: paths })).toEqual({ selected: 1 })
  })

  it.each([null, false, 0, ''])('stops fallback lookup at a resolved value and continues mapping: %s', (value) => {
    const source = Object.defineProperty({ value, name: 'Ada' }, 'later', {
      enumerable: true,
      get: () => {
        throw new Error('Must not read after a resolved fallback')
      },
    })
    const result = extract(source, {
      selected: ['missing', 'value', 'later'],
      name: 'name',
    })

    expect(result).toEqual({ selected: value, name: 'Ada' })
  })

  it('maps array items with [n]', () => {
    const result = extract(
      { products: [{ name: 'Keyboard' }, { name: 'Mouse' }] },
      {
        'items[n].title': 'products[n].name',
      }
    )

    expect(result).toEqual({ items: [{ title: 'Keyboard' }, { title: 'Mouse' }] })
  })

  it('sets undefined for direct unresolved source paths', () => {
    const result = extract(
      { profile: {} },
      {
        'user.name': 'profile.name',
      }
    )

    expect(result).toEqual({ user: { name: undefined } })
  })
})
