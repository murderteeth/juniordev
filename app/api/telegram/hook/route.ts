export const maxDuration = 60

import '@/lib/global'
import { NextRequest, NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import { Chat, TelegramWebHookSchema } from '@/lib/types'
import { getChat, upsertHooks } from '@/lib/db'
import * as pr from './agents/pr'
import * as setup from './agents/setup'
import { hasCommands, handleSimpleCommand, hasSimpleCommand, parseSimpleCommand } from '@/lib/commands'
import { simulateHookForAgent } from './agents/lib'

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN ?? '')

function readyToGo(chat: Chat) {
  return chat.github_repo_owner && chat.github_repo_name
}

export async function POST(request: NextRequest) {
  const hook = TelegramWebHookSchema.parse(await request.json())
  if (!hook.message) { return NextResponse.json({ ok: 'ok' }) }

  if (hasCommands(hook)) {
    await bot.sendChatAction(hook.message.chat.id.toString(), 'typing')
  }

  try {
    const chat = await getChat(hook.message.chat.id)
    chat.hooks.push(hook)
    upsertHooks({ ...chat })

    if (hasCommands(hook)) {
      console.log('chat', chat)

      let response: string | undefined = undefined

      if (hasSimpleCommand(hook)) {
        const command = parseSimpleCommand(hook)!
        response = await handleSimpleCommand(command, chat)

      } else if (!readyToGo(chat)) {
        response = await setup.respond(chat)
        console.log('setup.respond', response)

      } else {
        response = await pr.respond(chat)
        console.log('pr.respond', response)

      }

      if (response) {
        chat.hooks.push(simulateHookForAgent(response))
        await upsertHooks({ ...chat })

        await bot.sendMessage(
          hook.message!.chat.id.toString(), response,
          { parse_mode: 'Markdown' }
        )
      }
    }

  } catch(error) {
    console.error(error)
    await bot.sendMessage(
      hook.message.chat.id.toString(),
      `😿😿😿 \`\`\`${error}\`\`\` 😿😿😿`, 
      { parse_mode: 'Markdown' }
    )

  } finally {
    return NextResponse.json({ ok: 'ok' })

  }
}
