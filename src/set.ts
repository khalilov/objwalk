export type ObjwalkObject = Record<string, any>

type ParsedPathSegment = {
  key: string
  isArray: boolean
  index: number
}

const parseArrayPathSegment = (key: string): ParsedPathSegment => {
  const matches = key.match(/^(\w+)\[(\d+)\]$/)

  if (matches) {
    return {
      key: matches[1],
      isArray: true,
      index: parseInt(matches[2], 10),
    }
  }

  return { key, isArray: false, index: -1 }
}

export const set = (data: ObjwalkObject = {}, path: string, value: any): ObjwalkObject => {
  const keys = path.split('.')
  let current = data

  for (let i = 0; i < keys.length; i++) {
    const { key, isArray, index } = parseArrayPathSegment(keys[i])
    const isLastKey = i === keys.length - 1

    if (isArray) {
      if (!current[key] || !Array.isArray(current[key])) {
        current[key] = []
      }

      if (index >= current[key].length) {
        current[key].length = index + 1
      }

      if (!isLastKey && current[key][index] === undefined) {
        current[key][index] = {}
      }

      if (isLastKey) {
        current[key][index] = value
        break
      }

      current = current[key][index]
    } else if (!isLastKey) {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }

      current = current[key]
    } else {
      current[key] = value
    }
  }

  return data
}
