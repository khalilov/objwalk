import { describe, expect, it } from 'vitest'

import { parsePathSelection } from '../../helpers'

describe('parsePathSelection', () => {
  it('returns empty keys for a plain path', () => {
    expect(parsePathSelection('user.name')).toEqual({ cleanPath: 'user.name', keys: [] })
  })

  it('parses selected keys and trims whitespace', () => {
    expect(parsePathSelection('user.{ name, email }')).toEqual({ cleanPath: 'user', keys: ['name', 'email'] })
  })

  it('parses all-keys selection', () => {
    expect(parsePathSelection('user.{*}')).toEqual({ cleanPath: 'user', keys: 'all' })
  })

  it('supports the compact legacy selection form', () => {
    expect(parsePathSelection('user{name,email}')).toEqual({ cleanPath: 'user', keys: ['name', 'email'] })
  })
})
