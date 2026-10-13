export type WalkKey = string | number

export type PickOptions = {
  inherited?: boolean
  ignore?: readonly string[]
}

export type ParseOptions = {
  fallback?: unknown
  onError?: (error: unknown) => void
  reviver?: Parameters<typeof JSON.parse>[1]
}

export type StringifyOptions = {
  fallback?: string
  onError?: (error: unknown) => void
  replacer?: ParseOptions['reviver'] | Parameters<typeof JSON.stringify>[1]
  space?: string | number
}
