import { each } from './each'
import { equally } from './equally'
import { isPlainObject } from './helpers/isPlainObject'
import { type ObjwalkObject } from './pick'
import { type DiffOperation } from './types'

type DiffFrame = {
  first: ObjwalkObject
  last: ObjwalkObject
  path: string[]
}

export const diff = (first: unknown, last: unknown): DiffOperation[] => {
  const operations: DiffOperation[] = []
  const frames: DiffFrame[] = []
  // each visits parents first; defer removals until leaving their branch.
  const finish = (depth: number): DiffFrame | undefined => {
    each(frames.splice(depth).reverse(), (_index, { first, last, path }: DiffFrame) => {
      each(Object.keys(first), (_index, key: string) => {
        if (Object.prototype.propertyIsEnumerable.call(last, key) === false) {
          operations.push({ type: 'delete', path: [...path, key] })
        }
      })
    }, { descend: ({ segments }) => segments.length === 0 })

    return frames.at(-1)
  }
  let descend = false

  each(last, (key, value, _path, segments) => {
    const path = segments.map(String)
    const frame = finish(segments.length)
    const present = key === undefined || (
      frame !== undefined && Object.prototype.propertyIsEnumerable.call(frame.first, key)
    )
    const previous = key === undefined ? first : present ? frame?.first[key] : undefined

    descend = false

    if (present && isPlainObject(previous) && isPlainObject(value)) {
      frames.push({ first: previous, last: value, path })
      descend = true
    } else if (present === false || equally(previous, value) === false) {
      operations.push({ type: 'set', path, value })
    }
  }, {
    root: true,
    descend: () => descend,
  })
  finish(0)

  return operations
}
