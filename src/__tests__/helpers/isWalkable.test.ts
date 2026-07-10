import { describe, expect, it } from 'vitest'

import { isWalkable } from '../../helpers'

describe('isWalkable', () => {
  it('returns true for objects and arrays', () => {
    expect(isWalkable({})).toBe(true)
    expect(isWalkable([])).toBe(true)
  })

  it('returns false for null and primitives', () => {
    expect(isWalkable(null)).toBe(false)
    expect(isWalkable('Ada')).toBe(false)
    expect(isWalkable(1)).toBe(false)
    expect(isWalkable(true)).toBe(false)
  })
})
