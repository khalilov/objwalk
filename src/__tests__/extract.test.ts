import { describe, expect, it } from 'vitest'

import { extract } from '../extract'

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
