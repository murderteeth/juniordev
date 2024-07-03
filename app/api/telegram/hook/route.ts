export const maxDuration = 60

import '@/lib/global'
import { NextRequest, NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import { Chat, TelegramWebHookSchema } from './types'
import { getChat } from './db'
import * as pr from './agents/pr'
import * as setup from './agents/setup'

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN ?? '')

function readyToGo(chat: Chat) {
  return chat.github_repo_owner && chat.github_repo_name
}

export async function POST(request: NextRequest) {
  const hook = TelegramWebHookSchema.parse(await request.json())
  if (!hook.message) { return NextResponse.json({ ok: 'ok' }) }

  await bot.sendChatAction(hook.message.chat.id.toString(), 'typing')

  try {
    const chat = await getChat(hook.message.chat.id)

    let response: string | undefined = undefined

    if (!readyToGo(chat)) {
      response = await setup.respond(hook, chat)
      console.log('response', response)
    } else {
      response = await pr.respond(hook)
    }

    if (response) {
      await bot.sendMessage(
        hook.message!.chat.id.toString(), response,
        { parse_mode: 'Markdown' }
      )
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
