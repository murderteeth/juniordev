import { expect, test } from 'bun:test'
import { nullsToUndefined } from './object'

test('replaces nulls with undefineds', () => {
  expect(nullsToUndefined({
    a: null,
    b: {
      c: null,
      d: {
        e: null,
      },
    },
  })).toEqual({
    a: undefined,
    b: {
      c: undefined,
      d: {
        e: undefined,
      },
    }
  })
})
