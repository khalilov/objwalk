import { describe, expect, it } from 'vitest'

import { createPath } from '../../helpers'

describe('createPath', () => {
  it('creates object paths', () => {
    expect(createPath('', 'user', false)).toBe('user')
    expect(createPath('user', 'name', false)).toBe('user.name')
  })

  it('creates array paths', () => {
    expect(createPath('', 0, true)).toBe('[0]')
    expect(createPath('items', 1, true)).toBe('items[1]')
  })
})
