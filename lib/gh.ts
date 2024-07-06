import jwt from 'jsonwebtoken'

const appId = Number(process.env.GITHUB_APP_ID || 0)
const pk = process.env.GITHUB_APP_PRIVATE_KEY || ''
const installationId = Number(process.env.GITHUB_APP_INSTALLATION_ID || 0)
const ghApiVersion = process.env.GITHUB_API_VERSION || '2022-11-28'

function appBearer() {
  const now = Math.floor(Date.now() / 1000)
  const thirtySecondsAgo = now - 30
  const tenMinutes = 60 * 10
  const expiration = thirtySecondsAgo + tenMinutes
  return jwt.sign({ 
    iat: thirtySecondsAgo, exp: expiration, iss: appId 
  }, pk, { algorithm: 'RS256' })
}

export async function fetchInstallToken() {
  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${appBearer()}`,
        'X-GitHub-Api-Version': ghApiVersion,
      },
    }
  )
  return (await response.json()).token as string
}

export async function fetchGhRaw({ installToken, owner, repo, branch, path }: Record<string, string>) {
  if (!installToken) { installToken = await fetchInstallToken() }

  const response = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch ?? 'main'}/${path}`,
    { headers: { Authorization: `Bearer ${installToken}` } }
  )
  return response.text()
}

async function fetchGh(installToken: string, url: string, options?: Record<string, string|object>) {
  if (!installToken) { installToken = await fetchInstallToken() }

  options = {
    ...options,
    method: (options?.method as string) ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': ghApiVersion,
      'Authorization': `Bearer ${installToken}`,
      ...(options?.headers as object)
    }
  }

  const response = await fetch(`https://api.github.com${url}`, options)

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(errorData)}`)
  }

  return response.json()
}

export async function newBranch({ installToken, owner, repo, base, name }: Record<string, string>) {
  const baseBranch = await fetchGh(installToken, `/repos/${owner}/${repo}/git/ref/heads/${base}`)
  return await fetchGh(installToken, `/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ 
      ref: `refs/heads/${name}`, 
      sha: baseBranch.object.sha 
    })
  })
}

export async function createCommit({ installToken, owner, repo, branch, message, files }: {
  installToken: string,
  owner: string,
  repo: string,
  branch: string,
  message: string,
  files: {
    path: string,
    content: string
  }[]
}) {
  const baseBranch = await fetchGh(installToken, `/repos/${owner}/${repo}/git/ref/heads/${branch}`)
  const baseTree = await fetchGh(installToken, `/repos/${owner}/${repo}/git/trees/${baseBranch.object.sha}`)
  const newTree = await fetchGh(installToken, `/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ 
      base_tree: baseTree.sha, 
      tree: files.map(file => ({
        ...file, mode: '100644', type: 'blob'
      }))
    })
  })

  const commit = await fetchGh(installToken, `/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message,
      tree: newTree.sha,
      parents: [baseBranch.object.sha]
    })
  })

  return await fetchGh(installToken, `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha })
  })
}

export async function pullRequest({ installToken, owner, repo, base, head, title, body }: Record<string, string>) {
  return await fetchGh(installToken, `/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ base, head, title, body })
  })
}

export async function repoStructure(owner: string, repo: string): Promise<string> {
  const url = `/repos/${owner}/${repo}/git/trees/main?recursive=1`
  const data = await fetchGh('', url)

  const files = data.tree.map((item: { path: string, type: string }) => ({
    path: item.path,
    isDirectory: item.type === 'tree',
  }))

  files.sort((a: { path: string }, b: { path: string }) => a.path.localeCompare(b.path))

  let structure = ''
  const addedDirs = new Set<string>()

  for (const file of files) {
    const parts = file.path.split('/')
    let currentPath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      currentPath += (i > 0 ? '/' : '') + part

      if (i === parts.length - 1 && !file.isDirectory) {
        structure += `${'--'.repeat(i)}- ${part}\n`
      } else if (!addedDirs.has(currentPath)) {
        structure += `${'--'.repeat(i)}- ${part}/\n`
        addedDirs.add(currentPath)
      }
    }
  }

  return structure.trimEnd()
}
