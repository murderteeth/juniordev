import { TelegramWebHook } from '@/lib/types'
import { expect, test } from 'bun:test'
import { parseMessages } from './setup'

test('parses TelegramWebHook[] into message stream', () => {
  const hooks: TelegramWebHook[] = [
    {
      update_id: 1n,
      message: {
        message_id: 1n,
        from: {
          id: 1n,
          is_bot: false,
          first_name: 'John',
          username: 'john_doe',
          language_code: 'en'
        },
        chat: {
          id: 1n,
          first_name: 'John',
          username: 'john_doe',
          type: 'private'
        },
        date: 1n,
        text: '/jr howdy junior dev!!'
      }
    },
    {
      update_id: 2n,
      message: {
        message_id: 2n,
        from: {
          id: 2n,
          is_bot: false,
          first_name: 'Jane',
          username: 'jane_doe',
          language_code: 'en'
        },
        chat: {
          id: 2n,
          first_name: 'Jane',
          username: 'jane_doe',
          type: 'private'
        },
        date: 2n,
        text: 'laters'
      }
    }
  ]

  const messages = parseMessages(hooks)
  expect(Bun.deepEquals(messages, [
    { role: 'user', content: '[john_doe]: howdy junior dev!!' },
    { role: 'user', content: '[jane_doe]: laters' }
  ])).toBeTrue()
})
