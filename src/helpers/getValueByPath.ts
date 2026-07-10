const arraySegmentRegex = /^(\w+)\[(\d+)\]$/

export const getValueByPath = (obj: any, path: string): any => {
  if (!path) return obj

  return path.split('.').reduce((result: any, current: string) => {
    if (result === null || result === undefined) {
      return undefined
    }

    const match = current.match(arraySegmentRegex)

    if (match) {
      const [, key, index] = match
      const array = result[key]

      return Array.isArray(array) ? array[parseInt(index, 10)] : undefined
    }

    return result[current]
  }, obj)
}
