import { describe, expect, it } from 'vitest'

import { pick } from '../pick'

const data = {
  user: { name: 'Ada', role: 'admin', email: 'ada@example.com' },
  items: [{ id: 'a' }],
  groups: [{ items: [{ id: 'x' }, { id: 'y' }] }],
}

describe('pick', () => {
  it('reads a nested object path', () => {
    expect(pick(data, 'user.name')).toBe('Ada')
  })

  it('reads a single array segment', () => {
    expect(pick(data, 'items[0]')).toEqual({ id: 'a' })
  })

  it('reads an array segment with a nested field', () => {
    expect(pick(data, 'items[0].id')).toBe('a')
  })

  it('reads multiple array segments', () => {
    expect(pick(data, 'groups[0].items[1].id')).toBe('y')
  })

  it('returns undefined for a missing index', () => {
    expect(pick(data, 'items[99].id')).toBeUndefined()
  })

  it('returns undefined for a missing nested field', () => {
    expect(pick(data, 'items[0].missing')).toBeUndefined()
  })

  it('keeps selected key syntax working', () => {
    expect(pick(data, 'user.{name,email}')).toEqual({ name: 'Ada', email: 'ada@example.com' })
  })

  it('keeps object key listing syntax working', () => {
    expect(pick(data, 'user.{*}')).toEqual(['name', 'role', 'email'])
  })
})
