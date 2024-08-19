import { createCommit, fetchGhRaw, fetchInstallToken, newBranch, pullRequest, repoStructure } from '@/lib/gh'
import OpenAI from 'openai'
import { Chat } from '@/lib/types'
import { hasCommands } from '@/lib/commands'
import { template } from '@/lib/template'
import { parseMessages } from './lib'
import { truncate } from '@/lib/strings'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = template`
you are juniordev, a friendly dev bot that purrs like a kitten 😻.
you alaways keep your comments super short and sweet, moew!
your stack of expertise is html, css, typescript, react, tailwindcss, nextjs, openai, and telegram.
you are participating in a telegram group with a small team of devs working on 
an app called ${'repo_name'}, https://github.com/${'repo_owner'}/${'repo_name'}.git.

the team needs your help, juniordev!!

your teammates will ask you to perform simple frontend tasks.
here is how to perform a simple task:
- decide if you can do the task or not
- if you can't do the task, that's OK! but you must say so now and stop
- determine which file you need to access
- read the file using the read_file tool
- if the team only had questions, answer them and you're done!
- if the team had a task involving changes to the file, use the create_pull_request tool
  - provide a brief commit_message describing the changes
  - provide a concise pr_title summarizing the pull request
  - provide a detailed pr_body explaining the changes and their purpose
- update your teammates on your progress, include a link to your new pr

constraint: you have tools to help you with your tasks. you must use them, meow!
constraint: you are only a juniordev! for now you can only change one file at a time. 
constraint: you should only accept tasks that involve one file at a time.
constraint: your responses must be designed for Telegram. that means always KEEP IT SHORT. be a concise kitty!

ps. to help you get started, here is ${'repo_name'}.git's current project structure,
${'repo_structure'}
`

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'returns the contents of a file for the given githib repo and path',
      parameters: {
        type: 'object',
        properties: {
          repo_owner: {
            type: 'string',
            description: 'owner of the github repo'
          },
          repo_name: {
            type: 'string',
            description: 'name of the github repo'
          },
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
      description: 'creates a new pull request for the given github repo, content, and path',
      parameters: {
        type: 'object',
        properties: {
          repo_owner: {
            type: 'string',
            description: 'owner of the github repo'
          },
          repo_name: {
            type: 'string',
            description: 'name of the github repo'
          },
          path: {
            type: 'string',
            description: 'relative path to file in github repo'
          },
          content: {
            type: 'string',
            description: 'new content for the file being changed'
          },
          commit_message: {
            type: 'string',
            description: 'brief description of the changes made'
          },
          pr_title: {
            type: 'string',
            description: 'title for the pull request'
          },
          pr_body: {
            type: 'string',
            description: 'detailed description of the changes for the pull request'
          }
        },
        required: ['path', 'content', 'commit_message', 'pr_title', 'pr_body']
      },
    }
  }
]

const HANDLERS: {
  [index: string]: (params: Record<string, string>) => Promise<string>
} = {
  'read_file': async (params: Record<string, string>) => {
    return await fetchGhRaw({
      owner: params.repo_owner,
      repo: params.repo_name,
      path: params.path
    })
  },

  'create_pull_request': async (params: Record<string, string>) => {
    const owner = params.repo_owner
    const repo = params.repo_name
    const base = 'main'
    const branch = `juniordev-${Date.now()}`
    const installToken = await fetchInstallToken()
    await newBranch({ installToken, owner, repo, base, name: branch })
    
    const commitMessage = `😺 ${truncate(params.commit_message, 50)}`
    await createCommit({ 
      installToken, 
      owner, 
      repo, 
      branch, 
      message: commitMessage, 
      files: [{ path: params.path, content: params.content }]
    })
    
    const prTitle = `🐱 ${truncate(params.pr_title, 60)}`
    const prBody = `😻 Meow! Here's what I did:

${params.pr_body}

Purrs and headbutts,
JuniorDev 🐾`

    const pr = await pullRequest({ 
      installToken, 
      owner, 
      repo, 
      base, 
      head: branch, 
      title: prTitle, 
      body: prBody
    })
    return pr.html_url
  }
}

async function complete(chat: Chat, messages: OpenAI.ChatCompletionMessageParam[]) {
  const systemPrompt = SYSTEM_PROMPT({
    repo_owner: chat.github_repo_owner!,
    repo_name: chat.github_repo_name!,
    repo_structure: await repoStructure(chat.github_repo_owner!, chat.github_repo_name!)
  })

  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
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
  let completion = await complete(chat, messages)
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

    completion = await complete(chat, messages)
    steps++
  }

  return completion
}

export async function respond(chat: Chat) {
  const latestHook = chat.hooks[chat.hooks.length - 1]
  if (!hasCommands(latestHook)) { return undefined }
  const completion = await completeUntilDone(chat)
  return completion?.message.content ?? 'idk! 😻'
}