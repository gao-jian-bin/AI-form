import { spawn, spawnSync } from 'node:child_process'
import { get } from 'node:http'
import { resolve } from 'node:path'

const host = '127.0.0.1'
const port = '4190'
const baseUrl = `http://${host}:${port}`
const projectRoot = resolve(import.meta.dirname, '..')

const serverEnvironment = {
  ...process.env,
  HOST: host,
  PORT: port,
  DATABASE_PATH: '.data/e2e-forum.db',
  SEED_DEMO_CONTENT: 'true',
  ADMIN_PASSWORD: 'ai-forum-local-admin',
  E2E_INSECURE_ADMIN_COOKIE: 'true',
  VIEW_HASH_SECRET: 'e2e-view-secret',
}

function waitForExit(child) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode ?? 1)
  return new Promise(resolveExit => child.once('exit', code => resolveExit(code ?? 1)))
}

function requestStatus(url) {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = get(url, (response) => {
      response.resume()
      resolveRequest(response.statusCode ?? 0)
    })
    request.setTimeout(2_000, () => request.destroy(new Error('健康检查超时')))
    request.on('error', rejectRequest)
  })
}

async function waitForServer(child) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`测试服务器提前退出，状态码 ${child.exitCode}`)
    try {
      const status = await requestStatus(`${baseUrl}/api/categories`)
      if (status >= 200 && status < 400) return
    } catch {
      // The server is still starting.
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 150))
  }
  throw new Error('等待测试服务器启动超时')
}

async function stopServer(child) {
  if (!child.pid || child.exitCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
  } else {
    child.kill('SIGTERM')
  }
}

const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  cwd: projectRoot,
  env: serverEnvironment,
  stdio: 'inherit',
  windowsHide: true,
})

let exitCode = 1
try {
  await waitForServer(server)
  const playwright = spawn(
    process.execPath,
    ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)],
    {
      cwd: projectRoot,
      env: { ...process.env, E2E_EXTERNAL_SERVER: 'true' },
      stdio: 'inherit',
      windowsHide: true,
    },
  )
  exitCode = await waitForExit(playwright)
} finally {
  await stopServer(server)
}

process.exit(exitCode)
