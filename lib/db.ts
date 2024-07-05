import { z } from 'zod'
import { Pool } from 'pg'
import { Chat, ChatSchema, TelegramWebHook } from './types'
import { nullsToUndefined } from './object'

export const db = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: (process.env.POSTGRES_PORT || 5432) as number,
  ssl: (process.env.POSTGRES_SSL || false) as boolean,
  database: process.env.POSTGRES_DATABASE || 'user',
  user: process.env.POSTGRES_USER || 'user',
  password: process.env.POSTGRES_PASSWORD || 'password'
})

export async function first<T>(schema: z.ZodType<T>, sql: string, params: any[] = []) {
  return (await query<T>(schema)(sql, params))[0]
}

function query<T>(schema: z.ZodType<T>) {
  return async function(sql: string, values: any[]) {
    const rows = (await db.query(sql, values)).rows
    return schema.array().parse(rows.map(
      r => nullsToUndefined(r))
    )
  }
}

export async function getChat(id: bigint) {
  const result = await first<Chat>(ChatSchema, 'SELECT * FROM chat WHERE id = $1', [id])
  if (result) return result
  await startChat(id)
  return ChatSchema.parse({
    id, hooks: [],
    created_at: new Date(),
    updated_at: new Date()
  })
}

export async function startChat(id: bigint) {
  await db.query('INSERT INTO chat (id) VALUES ($1)', [id])
}

export async function deleteChat(id: bigint) {
  await db.query('DELETE FROM chat WHERE id = $1', [id])
}

export async function upsertChat({
  id, github_repo_owner, github_repo_name, hooks
} : {
  id: bigint, 
  github_repo_owner?: string, 
  github_repo_name?: string, 
  hooks: TelegramWebHook[]
}) {
  await db.query(`
    INSERT INTO chat (id, github_repo_owner, github_repo_name, hooks)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id) DO UPDATE
    SET github_repo_owner = $2,
      github_repo_name = $3,
      hooks = $4,
      updated_at = NOW()
  `, [id, github_repo_owner, github_repo_name, JSON.stringify(hooks)])
}

export async function upsertHooks({
  id, hooks
}: {
  id: bigint,
  hooks: TelegramWebHook[]
}) {
  await db.query(`
    INSERT INTO chat (id, hooks)
    VALUES ($1, $2)
    ON CONFLICT (id) DO UPDATE
    SET hooks = $2,
      updated_at = NOW()
  `, [id, JSON.stringify(hooks)])
}
