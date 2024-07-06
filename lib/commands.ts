import { Chat, TelegramWebHook } from './types'
import { deleteChat, getChat, upsertChat } from './db'

interface CommandConfig {
  name: string;
  handler: (chat: Chat) => Promise<string>;
}

const COMMAND_PREFIXES = ['meow', 'dev', 'jr', 'jd', 'juniordev', 'junior']

const SIMPLE_COMMANDS: Record<string, CommandConfig> = {
  reset: {
    name: 'reset',
    handler: async (chat: Chat) => {
      chat.hooks.length = 0
      await upsertChat({ ...chat, hooks: [] })
      return 'chat reset! meeooow 😺'
    }
  },

  leave: {
    name: 'leave',
    handler: async (chat: Chat) => {
      await deleteChat(chat.id)
      return 'leaved! meeooow 👋😿'
    }
  },

  whoami: {
    name: 'whoami',
    handler: async (chat: Chat) => {
      return `whoami
chat.id: ${chat.id}
chat.github_repo_owner: ${chat.github_repo_owner}
chat.github_repo_name: ${chat.github_repo_name}`
    }
  }
}

const PREFIX_REGEX = new RegExp(`^/(${COMMAND_PREFIXES.join('|')}) `)
const SIMPLE_COMMAND_REGEX = new RegExp(`^/(${COMMAND_PREFIXES.join('|')}) (${Object.keys(SIMPLE_COMMANDS).join('|')})$`)

export function hasCommands(hook: TelegramWebHook): boolean {
  return PREFIX_REGEX.test(hook.message?.text ?? '')
}

export function hasSimpleCommand(hook: TelegramWebHook): boolean {
  return SIMPLE_COMMAND_REGEX.test(hook.message?.text ?? '')
}

export function parseSimpleCommand(hook: TelegramWebHook): string | undefined {
  const match = hook.message?.text.match(SIMPLE_COMMAND_REGEX)
  return match ? match[2] : undefined
}

export async function handleSimpleCommand(command: string, chat: Chat): Promise<string> {
  const commandConfig = SIMPLE_COMMANDS[command]
  if (commandConfig) {
    return await commandConfig.handler(chat)
  }
  throw new Error(`Unknown command: ${command}`)
}

export function trimPrefix(message: string): string {
  return message.replace(PREFIX_REGEX, '')
}
