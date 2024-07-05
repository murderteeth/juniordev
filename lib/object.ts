export function nullsToUndefined(obj: any) {
  if (obj === null) {
    return undefined
  } else if (typeof obj === 'object') {
    for (const key in obj) {
      obj[key] = nullsToUndefined(obj[key])
    }
  }
  return obj
}
