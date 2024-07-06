import { trimPrefix } from '@/lib/commands'
import { TelegramWebHook } from '@/lib/types'
import OpenAI from 'openai'

export function parseMessages(hooks: TelegramWebHook[]) {
  return hooks.map(hook => {
    const isAssistant = hook.message?.from.username === 'assistant'
    const role = isAssistant ? 'assistant' : 'user'
    const message = trimPrefix(hook.message?.text ?? '')
    const content = isAssistant ? message : `[${hook.message?.from.username}]: ${message}`
    return { role, content } as OpenAI.ChatCompletionMessageParam
  })
}

export function simulateHookForAgent(message: string): TelegramWebHook {
  return {
    update_id: 0n,
    message: {
      message_id: 0n,
      from: {
        id: 0n,
        is_bot: true,
        first_name: 'assistant',
        username: 'assistant',
        language_code: 'en'
      },
      chat: {
        id: 0n,
        first_name: 'assistant',
        username: 'assistant',
        type: 'private'
      },
      date: BigInt(Math.floor(Date.now() / 1000)),
      text: message
    }
  }
}
