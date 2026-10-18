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
    for (const { first, last, path } of frames.splice(depth).reverse()) {
      for (const key of Object.keys(first)) {
        if (Object.prototype.propertyIsEnumerable.call(last, key) === false) {
          operations.push({ type: 'delete', path: [...path, key] })
        }
      }
    }

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
