import { z } from 'zod'

export const ChatSchema = z.object({
  id: z.bigint({ coerce: true }),
  github_repo_owner: z.string().nullish(),
  github_repo_name: z.string().nullish(),
  messages: z.array(z.string()),
  created_at: z.date(),
  updated_at: z.date()
})

export type Chat = z.infer<typeof ChatSchema>

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
    first_name: z.string(),
    username: z.string(),
    type: z.string(),
  }),
  date: z.bigint({ coerce: true }),
  text: z.string()
})

export const TelegramWebHookSchema = z.object({
  update_id: z.bigint({ coerce: true }),
  message: TelegramMessageSchema.optional(),
  edited_message: TelegramMessageSchema.optional()
})

export type TelegramWebHook = z.infer<typeof TelegramWebHookSchema>
