export const getValueByPath = (obj: any, path: string): any => {
  if (!path) return obj

  return path.split('.').reduce((result: any, current: string) => {
    if (result !== null && result !== undefined) {
      const match = current.match(/(w+)[(d+)]/)

      if (match) {
        const [, key, index] = match
        const array = result[key]

        return array && Array.isArray(array) ? array[parseInt(index, 10)] : undefined
      }

      return result[current]
    }

    return undefined
  }, obj)
}
