import { expect, test } from 'bun:test'
import { hasCommands, hasSimpleCommand, parseSimpleCommand } from './commands'
import { MockTelegramWebHook } from './spec'

test('knows if a message has commands', () => {
  expect(hasCommands(MockTelegramWebHook({
    text: '/dev howdy junior dev!!'
  }))).toBeTrue()

  expect(hasCommands(MockTelegramWebHook({
    text: '/jr howdy junior dev!!'
  }))).toBeTrue()

  expect(hasCommands(MockTelegramWebHook({
    text: 'howdy someone else!!'
  }))).toBeFalse()
})

test('knows if a message has simple commands', () => {
  expect(hasSimpleCommand(
    MockTelegramWebHook({ text: 'howdy!!' })
  )).toBeFalse()

  expect(hasSimpleCommand(
    MockTelegramWebHook({ text: '/jr howdy!!' })
  )).toBeFalse()

  expect(hasSimpleCommand(
    MockTelegramWebHook({ text: 'reset' })
  )).toBeFalse()

  expect(hasSimpleCommand(
    MockTelegramWebHook({ text: '/jr reset' })
  )).toBeTrue()

  expect(hasSimpleCommand(
    MockTelegramWebHook({ text: '/jr leave' })
  )).toBeTrue()
})

test('parses simple commands', () => {
  expect(parseSimpleCommand(
    MockTelegramWebHook({ text: 'howdy!!' })
  )).toBeUndefined()

  expect(parseSimpleCommand(
    MockTelegramWebHook({ text: '/jr howdy!!' })
  )).toBeUndefined()

  expect(parseSimpleCommand(
    MockTelegramWebHook({ text: 'reset' })
  )).toBeUndefined()

  expect(parseSimpleCommand(
    MockTelegramWebHook({ text: '/jr reset' })
  )).toBe('reset')

  expect(parseSimpleCommand(
    MockTelegramWebHook({ text: '/jr leave' })
  )).toBe('leave')
})
