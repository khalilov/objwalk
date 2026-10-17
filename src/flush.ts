import { getValueByPath } from './helpers/getValueByPath'
import { getValueByKey } from './helpers/getValueByKey'
import { type ObjwalkObject } from './pick'

export const flush = (data: ObjwalkObject = {}, path: string): ObjwalkObject => {
  if (path.length > 0) {
    const keys = path.split('.')
    const lastKey = keys.pop() ?? ''
    const match = lastKey.match(/^(\w+)\[(\d+)\]$/)
    let parent = getValueByPath(data, keys.join('.'), { inherited: false })
    let key = lastKey

    if (match) {
      const [, arrayKey, index] = match
      const array = getValueByKey(parent, arrayKey, { inherited: false })

      parent = Array.isArray(array) ? array : undefined
      key = index
    }

    if (parent !== null && typeof parent === 'object' && Object.hasOwn(parent, key)) {
      delete parent[key]
    }
  }

  return data
}
