export type PlaceholderValues = {
  [key: string]: string | number
}

export function template(strings: TemplateStringsArray, ...keys: string[]): (placeholders: PlaceholderValues) => string {
  return (placeholders) => {
    let result = strings[0]
    keys.forEach((key, i) => {
      result += String(placeholders[key]) + strings[i + 1]
    })
    return result
  }
}
