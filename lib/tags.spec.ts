import { expect, test } from 'bun:test'
import { trim } from './tags'

test('trims', () => {
  expect(trim``).toBe('')
  expect(trim` a `).toBe('a')
  expect(trim`\na\n`).toBe('a')
  expect(trim`\ta\t`).toBe('a')
  expect(trim` \n\ta \n\t\n b\t\n `).toBe('a \n\t\n b')
})
