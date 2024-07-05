
export function MockTelegramWebHook({ 
  id, username, text
}: {
  id?: bigint, username?: string, text?: string 
}) {
  return {
    update_id: id ?? 1n,
    message: {
      message_id: id ?? 1n,
      from: {
        id: id ?? 1n,
        is_bot: false,
        first_name: username ?? 'john_doe',
        username: username ?? 'john_doe',
        language_code: 'en'
      },
      chat: {
        id: id ?? 1n,
        first_name: username ?? 'john_doe',
        username: username ?? 'john_doe',
        type: 'private'
      },
      date: id ?? 1n,
      text: text ?? ''
    }
  }
}
