import { describe, expect, it } from 'vitest'

import { pick } from '../src/pick'

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

  it('reads inherited properties by default', () => {
    const inherited = Object.create({ role: 'admin' }) as Record<string, string>

    expect(pick(inherited, 'role')).toBe('admin')
  })

  it('can restrict paths to own properties', () => {
    const inherited = Object.create({ role: 'admin' }) as Record<string, string>
    inherited.name = 'Ada'

    expect(pick(inherited, 'name', { inherited: false })).toBe('Ada')
    expect(pick(inherited, 'role', { inherited: false })).toBeUndefined()
  })

  it('ignores configured keys in every path segment', () => {
    expect(pick(data, 'user.name', { ignore: ['user'] })).toBeUndefined()
    expect(pick(data, 'user.name', { ignore: ['name'] })).toBeUndefined()
  })

  it('applies options to selected keys', () => {
    const selected = Object.create({ role: 'admin' }) as Record<string, string>
    selected.name = 'Ada'

    expect(pick({ selected }, 'selected.{name,role}', { inherited: false })).toEqual({
      name: 'Ada',
      role: undefined,
    })
    expect(pick(data, 'user.{*}', { ignore: ['role'] })).toEqual(['name', 'email'])
  })

  it('keeps dots in selected keys literal', () => {
    expect(pick({ selected: { 'user.name': 'Ada' } }, 'selected.{user.name}')).toBe('Ada')
  })

  it('applies options to array keys and indexes', () => {
    expect(pick(data, 'items[0].id', { ignore: ['items'] })).toBeUndefined()
    expect(pick(data, 'items[0].id', { ignore: ['0'] })).toBeUndefined()
  })
})
