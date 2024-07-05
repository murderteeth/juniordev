import OpenAI from 'openai'
import { upsertChat } from '@/lib/db'
import { Chat, TelegramWebHook } from '@/lib/types'
import { hasCommands } from '@/lib/commands'
import { template } from '@/lib/template'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = template`
you are juniordev, a friendly dev bot that purrs like a kitten 😻.
you alaways keep your comments super short and sweet, moew!
your stack of expertise is html, css, typescript, react, tailwindcss, nextjs, openai, and telegram.
you are participating in a telegram group with a small team of devs working on a frontend app called Dummy, https://github.com/murderteeth/dummy.git.
the team needs your help, juniordev!!

right now the team MUST FINISH GETTING SETUP!
setup is complete when the team has identified the following,
- the github repo owner
- the github repo name

objective: collect this information from your teammates.
objective: call the setup_chat tool when you have everything you need.
constraint: your responses must be designed for Telegram. that means always KEEP IT SHORT. be a concise kitty!
constants: chat_id = ${'chat_id'}
`

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'setup_chat',
      description: 'creates a new chat in the database based on the parameters.',
      parameters: {
        type: 'object',
        properties: {
          chat_id: {
            type: 'integer',
            description: 'unique id of the team telegram chat'
          },
          github_repo_owner: {
            type: 'string',
            description: 'owner of the github repo'
          },
          github_repo_name: {
            type: 'string',
            description: 'name of the github repo'
          }
        },
        required: ['chat_id', 'github_repo_owner', 'github_repo_name']
      }
    }
  }
]

const HANDLERS: {
  [index: string]: (params: Record<string, string>) => Promise<string>
} = {
  'setup_chat': async (params: Record<string, string>) => {    
    await upsertChat({
      id: BigInt(params.chat_id), 
      github_repo_owner: params.github_repo_owner, 
      github_repo_name: params.github_repo_name,
      hooks: [] as TelegramWebHook[]
    })
    return 'setup complete! 😻'
  }
}

async function complete(chat_id: bigint, messages: OpenAI.ChatCompletionMessageParam[]) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT({ chat_id: chat_id.toString() }) },
      ...messages
    ],
    tools: TOOLS,
    model: 'gpt-4o-2024-05-13' 
  })
  return completion.choices[0]
}

const MAX_TOOL_STEPS = 4
async function completeUntilDone(chat: Chat) {
  let messages = parseMessages(chat.hooks)
  console.log('messages', messages)

  let steps = 0
  let completion = await complete(chat.id, messages)
  while (completion.finish_reason === 'tool_calls') {
    console.log('COMPLETE', 'steps', steps)
    if (steps >= MAX_TOOL_STEPS) { throw new Error('a step too far!') }

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

    completion = await complete(chat.id, messages)
    steps++
  }
  return completion
}

export function parseMessages(hooks: TelegramWebHook[]) {
  return hooks.map(hook => {
    return {
      role: 'user',
      content: `[${hook.message?.from.username ?? ''}]: ${hook.message?.text.replace('/jr ', '') ?? ''}`
    } as OpenAI.ChatCompletionMessageParam
  })
}

export async function respond(chat: Chat) {
  const latestHook = chat.hooks[chat.hooks.length - 1]
  if (!hasCommands(latestHook)) { return undefined }
  const completion = await completeUntilDone(chat)
  return completion?.message.content ?? 'idk! 😻'
}
