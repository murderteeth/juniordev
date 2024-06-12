import { z } from 'zod'
import { Pool } from 'pg'
import { Chat, ChatSchema } from './types'

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
    return schema.array().parse(rows)
  }
}

export async function getChat(id: bigint) {
  const result = await first<Chat>(ChatSchema, 'SELECT * FROM chat WHERE id = $1', [id])
  if (result) return result
  await startChat(id)
  return ChatSchema.parse({ 
    id, 
    messages: [], 
    created_at: new Date(), 
    updated_at: new Date() 
  })
}

export async function startChat(id: bigint) {
  await db.query('INSERT INTO chat (id) VALUES ($1)', [id])
}

export async function upsertChat(id: bigint, githubRepoOwner: string, githubRepoName: string) {
  await db.query(`
    INSERT INTO chat (id, github_repo_owner, github_repo_name)
    VALUES ($1, $2, $3)
    ON CONFLICT (id) DO UPDATE
    SET github_repo_owner = $2, github_repo_name = $3
  `, [id, githubRepoOwner, githubRepoName])
}
