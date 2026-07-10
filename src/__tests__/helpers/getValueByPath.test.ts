import { describe, expect, it } from 'vitest'

import { getValueByPath } from '../../helpers'

const data = {
  user: { name: 'Ada' },
  items: [{ id: 'a' }],
  groups: [{ items: [{ id: 'x' }, { id: 'y' }] }],
}

describe('getValueByPath', () => {
  it('returns the root object for an empty path', () => {
    expect(getValueByPath(data, '')).toBe(data)
  })

  it('reads nested object values', () => {
    expect(getValueByPath(data, 'user.name')).toBe('Ada')
  })

  it('reads array index segments', () => {
    expect(getValueByPath(data, 'items[0].id')).toBe('a')
    expect(getValueByPath(data, 'groups[0].items[1].id')).toBe('y')
  })

  it('returns undefined for missing paths', () => {
    expect(getValueByPath(data, 'items[99].id')).toBeUndefined()
    expect(getValueByPath(data, 'items[0].missing')).toBeUndefined()
  })
})
