export type PathSelection = {
  cleanPath: string
  keys: string[] | 'all'
}

const selectionRegex: RegExp = /(.*){([^}]+)}$/

const normalizeSelectionPath = (path: string): string => {
  return path.endsWith('.') ? path.slice(0, -1) : path
}

const parseSelectedKeys = (selection: string): string[] | 'all' => {
  if (selection.trim() === '*') {
    return 'all'
  }

  return selection
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
}

export const parsePathSelection = (path: string = ''): PathSelection => {
  const matches: RegExpMatchArray | null = path.match(selectionRegex)

  if (!matches) {
    return {
      cleanPath: path,
      keys: [],
    }
  }

  return {
    cleanPath: normalizeSelectionPath(matches[1]),
    keys: parseSelectedKeys(matches[2]),
  }
}
