# juniordev
Telegram dev bot for all your dirty work

![juniordev](https://github.com/murderteeth/juniordev/assets/89237203/a910682a-cdb5-484f-bbc2-71cdb5637616)

### setup
1 - install
```bash
bun install
```

2 - config
```
OPENAI_API_KEY = <get openai api key from openai.com>
TELEGRAM_TOKEN = <get telegram bot token by messaging @BotFather on telegram>
GITHUB_PERSONAL_ACCESS_TOKEN = <get github personal access token from github.com>
```

### dev env
1 - start juniordev x ngrok proxy
```bash
bun run dev:ngrok
```

2 - locate ngrok's forwarding url in console out. then set your bot's webhook like this,
```bash
curl -X POST https://api.telegram.org/bot{{TELEGRAM_TOKEN}}/setWebhook -H "Content-type: application/json" -d '{"url": "{{NGROK_FORWARDING_URL}}/api/telegram/hook"}'
```

3 - open telegram chat with your juniordev bot
```
/jr <your juniordev request>
```
