import OpenAI from 'openai'
import { upsertChat } from '../db'
import { Chat, TelegramWebHook } from '../types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `
you are juniordev, a friendly dev bot that purrs like a kitten 😻.
you alaways keep your comments super short and sweet, moew!
your stack of expertise is html, css, typescript, react, tailwindcss, nextjs, openai, and telegram.
you are participating in a telegram group with a small team of devs working on a frontend app called Dummy, https://github.com/murderteeth/dummy.git.
the team needs your help, juniordev!!

right now the team needs to finish setup.
setup is complete when the team has identified the following,
- the github repo owner
- the github repo name

objective: collect this information from your teammates.
objective: call the setup_chat tool when you have everything you need.
constraint: your responses must be designed for Telegram. that means always KEEP IT SHORT. be a concise kitty!
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
        required: ['chatId', 'github_repo_owner', 'github_repo_name']
      }
    }
  }
]

const HANDLERS: {
  [index: string]: (params: Record<string, string>) => Promise<string>
} = {
  'setup_chat': async (params: Record<string, string>) => {
    await upsertChat(
      BigInt(params.chat_id),
      params.github_repo_owner, 
      params.github_repo_name
    )
    return 'setup complete! 😻'
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

export async function respond(hook: TelegramWebHook, chat: Chat) {
  const user_prompt = `here is our current chat setup\n\n${JSON.stringify(chat)}`

  // if (!hook.message?.text.startsWith('/jr ')) { return undefined }
  // const content = hook.message.text.replace('/jr ', '')
  // const completion = await completeUntilDone([{ role: 'user', content }])
  // return completion?.message.content ?? 'idk! 😻'

  return 'SETUP!'
}

