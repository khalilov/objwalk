export const isWalkable = (value: any): value is Record<string, any> | any[] => {
  return value !== null && typeof value === 'object'
}
