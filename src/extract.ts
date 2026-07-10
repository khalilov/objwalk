import { pick, type ObjwalkObject } from './pick'
import { set } from './set'

export type ExtractMapping = Record<string, string | string[]>

const mapArrayItems = (
  destinationPath: string,
  sourcePath: string,
  source: ObjwalkObject = {},
  result: ObjwalkObject = {}
) => {
  const destinationParts = destinationPath.split('[n].')
  const sourceParts = sourcePath.split('[n].')
  const array = pick(source, sourceParts[0])

  if (Array.isArray(array)) {
    array.forEach((row, index) => {
      const itemPath = destinationParts[0] + '[' + index + '].' + destinationParts[1]
      set(result, itemPath, pick(row, sourceParts[1]))
    })
  }
}

export const extract = (source: ObjwalkObject, mapping: ExtractMapping): ObjwalkObject => {
  const result: ObjwalkObject = {}

  Object.entries(mapping).forEach(([destinationPath, sourcePath]) => {
    if (destinationPath.includes('[n]') && typeof sourcePath === 'string') {
      mapArrayItems(destinationPath, sourcePath, source, result)
      return
    }

    if (Array.isArray(sourcePath)) {
      for (const item of sourcePath) {
        const value = pick(source, item)

        if (value !== undefined) {
          set(result, destinationPath, value)
          break
        }
      }

      return
    }

    set(result, destinationPath, pick(source, sourcePath))
  })

  return result
}
