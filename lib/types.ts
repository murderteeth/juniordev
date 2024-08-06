import { z } from 'zod'

export const TelegramMessageSchema = z.object({
  message_id: z.bigint({ coerce: true }),
  from: z.object({
    id: z.bigint({ coerce: true }),
    is_bot: z.boolean(),
    first_name: z.string(),
    username: z.string(),
    language_code: z.string(),
  }),
  chat: z.object({
    id: z.bigint({ coerce: true }),
    first_name: z.string().optional(),
    username: z.string().optional(),
    title: z.string().optional(),
    type: z.string(),
  }),
  date: z.bigint({ coerce: true }).optional(),
  text: z.string().optional()
})

export const TelegramWebHookSchema = z.object({
  update_id: z.bigint({ coerce: true }),
  message: TelegramMessageSchema.optional(),
  edited_message: TelegramMessageSchema.optional()
})

export type TelegramWebHook = z.infer<typeof TelegramWebHookSchema>

export const ChatSchema = z.object({
  id: z.bigint({ coerce: true }),
  github_repo_owner: z.string().optional(),
  github_repo_name: z.string().optional(),
  hooks: TelegramWebHookSchema.array(),
  created_at: z.date(),
  updated_at: z.date()
})

export type Chat = z.infer<typeof ChatSchema>
