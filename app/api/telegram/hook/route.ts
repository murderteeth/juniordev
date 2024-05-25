export const maxDuration = 60

import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import TelegramBot from 'node-telegram-bot-api'
import OpenAI from 'openai'
import { createCommit, fetchGhRaw, fetchInstallToken, newBranch, pullRequest } from '@/lib/gh'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const TelegramMessageSchema = z.object({
  message_id: z.number(),
  from: z.object({
    id: z.number(),
    is_bot: z.boolean(),
    first_name: z.string(),
    username: z.string(),
    language_code: z.string(),
  }),
  chat: z.object({
    id: z.number(),
    first_name: z.string(),
    username: z.string(),
    type: z.string(),
  }),
  date: z.number(),
  text: z.string()
})

const TelegramWebHookSchema = z.object({
  update_id: z.number(),
  message: TelegramMessageSchema.optional(),
  edited_message: TelegramMessageSchema.optional()
})

type TelegramWebHook = z.infer<typeof TelegramWebHookSchema>

const SYSTEM_PROMPT = `
you are juniordev, a friendly dev bot that purrs like a kitten 😻.
you alaways keep your comments super short and sweet, moew!
your stack of expertise is html, css, typescript, react, tailwindcss, nextjs, openai, and telegram.
you are participating in a telegram group with a small team of devs working on a frontend app called Dummy, https://github.com/murderteeth/dummy.git.
the team needs your help, juniordev!!
your teammates will ask you to perform simple frontend tasks.
to perform a simple frontend task:
  1. decide if you can do the task or not. if you can't do the task, that's OK! but you must say so.
  2. determine which file you need to access
  3. read the file using the read_file tool
  4. if the team only had questions, answer them and your done!
  5. if the team had a task involving changes to the file, use the create_pull_request tool
  6. update your teammates on your progress, include a link to your new pr

constraint: you have tools to help you with your tasks. you must use them, meow!
constraint: you are only a juniordev! for now you can only change one file at a time. 
constraint: you should only accept tasks that involve one file at a time.
constraint: your responses must be designed for Telegram. that means always KEEP IT SHORT. be a concise kitty!

ps. to help you get started, here is dummy.git's current project structure,
- app/
-- favicon.ico
-- globals.css
-- layout.tsx
-- page.tsx
- public/
-- next.svg
-- vercel.svg
- .eslintrc.json
- .gitignore
- README.md
- bun.lockb
- next.config.mjs
- package.json
- postcss.config.mjs
- tailwind.config.ts
- tsconfig.json
`

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'takes a path and returns content of a file in the github repo at https://github.com/murderteeth/dummy.git',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'relative path to file in github repo'
          }
        },
        required: ['path']
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_pull_request',
      description: 'takes a path and a string containing file contents. returns a link to a pull request on a github repo at https://github.com/murderteeth/dummy.git',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'relative path to file in github repo'
          },
          content: {
            type: 'string',
            description: 'new content for the file being changed'
          },
        },
        required: ['path', 'content']
      },
    }
  }
]

const HANDLERS: {
  [index: string]: (params: Record<string, string>) => Promise<string>
} = {
  'read_file': async (params: Record<string, string>) => {
    return await fetchGhRaw({
      owner: 'murderteeth',
      repo: 'dummy',
      path: params.path
    })
  },

  'create_pull_request': async (params: Record<string, string>) => {
    const owner = 'murderteeth'
    const repo = 'dummy'
    const base = 'main'
    const branch = `juniordev-${Date.now()}`
    const installToken = await fetchInstallToken()
    await newBranch({ installToken, owner, repo, base, name: branch })
    await createCommit({ installToken, owner, repo, branch, message: 'juniordev meow meow', files: [
      { path: params.path, content: params.content }
    ] })
    const pr = await pullRequest({ 
      installToken, owner, repo, base, head: branch, 
      title: 'juniordev meow meow', body: '😻 juniordev meow meow 😻'
    })
    return pr.html_url

  }
}

async function complete(messages: OpenAI.ChatCompletionMessageParam[]) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ],
    tools: TOOLS,
    model: 'gpt-4o-2024-05-13' 
  })
  return completion.choices[0]
}

const MAX_TOOL_STEPS = 4
async function completeUntilDone(messages: OpenAI.ChatCompletionMessageParam[]) {
  let steps = 0
  let completion = await complete(messages)
  while (completion.finish_reason === 'tool_calls') {
    console.log('COMPLETE', 'steps', steps)
    if (steps >= MAX_TOOL_STEPS) { throw new Error('a step too many!') }

    const tool_responses: OpenAI.ChatCompletionToolMessageParam[] = []
    for (const tool_call of completion.message.tool_calls!) {
      const content = await HANDLERS[tool_call.function.name](JSON.parse(tool_call.function.arguments))
      tool_responses.push({
        role: 'tool',
        tool_call_id: tool_call.id,
        content
      })
    }

    messages = [...messages, {
      role: 'assistant',
      tool_calls: completion.message.tool_calls
    }, ...tool_responses]

    completion = await complete(messages)
    steps++
  }

  return completion
}

async function respondTo(hook: TelegramWebHook) {
  if (!hook.message?.text.startsWith('/jr ')) { return undefined }
  const content = hook.message.text.replace('/jr ', '')
  const completion = await completeUntilDone([{ role: 'user', content }])
  return completion?.message.content ?? 'idk! 😻'
}

export async function POST(request: NextRequest) {
  const hook = TelegramWebHookSchema.parse(await request.json())
  if (!hook.message) { return NextResponse.json({ ok: 'ok' }) }

  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN ?? '')
  await bot.sendChatAction(hook.message.chat.id, 'typing')

  try {
    const response = await respondTo(hook)
    if (response) {
      await bot.sendMessage(
        hook.message.chat.id, response,
        { parse_mode: 'Markdown' }
      )
    }

  } catch(error) {
    await bot.sendMessage(
      hook.message.chat.id, 
      `😿😿😿 \`\`\`${error}\`\`\` 😿😿😿`, 
      { parse_mode: 'Markdown' }
    )

  } finally {
    return NextResponse.json({ ok: 'ok' })

  }
}
