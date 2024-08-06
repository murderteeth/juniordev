// This script sets up a dev environment for a Telegram bot using Next.js and ngrok. 
// It starts an ngrok tunnel, sets a Telegram webhook using the ngrok URL, and launches 
// the Next.js development server. The main function orchestrates these steps, enabling local 
// development and testing of the Telegram bot.

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN ?? ''

import { spawn } from 'child_process'
import ngrok from 'ngrok'

async function startNgrok(): Promise<string> {
  const url = await ngrok.connect(3000)
  console.log(`ngrok tunnel opened at ${url}`)
  return url
}

async function setTelegramWebhook(url: string): Promise<void> {
  const webhookUrl = `${url}/api/telegram/hook`
  const setWebhookUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`

  try {
    const response = await fetch(setWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: webhookUrl })
    })
    const data = await response.json()
    console.log('telegram webhook set')
  } catch (error) {
    console.error('Error setting telegram webhook:', error)
  }
}

function startNextDev(): void {
  const nextProcess = spawn('npx', ['next', 'dev'])

  nextProcess.stdout?.on('data', (data) => {
    console.log(data.toString())
  })

  nextProcess.stderr?.on('data', (data) => {
    console.error(data.toString())
  })

  nextProcess.on('close', (code) => {
    console.log(`Next.js process exited with code ${code}`)
  })
}

async function main(): Promise<void> {
  const ngrokUrl = await startNgrok()
  await setTelegramWebhook(ngrokUrl)
  startNextDev()
}

main()
