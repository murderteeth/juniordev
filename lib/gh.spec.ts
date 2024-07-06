import { expect, test } from 'bun:test'
import { repoStructure } from './gh'
import { trim } from './tags'

const EXPECTED = trim`
- .eslintrc.json
- .gitignore
- app/
--- favicon.ico
--- globals.css
--- layout.tsx
--- page.tsx
- bun.lockb
- next.config.mjs
- package.json
- postcss.config.mjs
- README.md
- tailwind.config.ts
- tsconfig.json
`

test('gets the directory structure of a repo', async () => {
  const structure = await repoStructure('murderteeth', 'dummy')
  expect(structure).toBe(EXPECTED)
})
