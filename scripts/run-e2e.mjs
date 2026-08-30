import { spawn, spawnSync } from 'node:child_process'
import { scryptSync } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { get } from 'node:http'
import { join, relative, resolve, sep } from 'node:path'

const host = '127.0.0.1'
const port = '4190'
const baseUrl = `http://${host}:${port}`
const projectRoot = resolve(import.meta.dirname, '..')
const e2eTempParent = resolve(projectRoot, '.data/e2e-runs')
mkdirSync(e2eTempParent, { recursive: true })
const e2eDataRoot = mkdtempSync(join(e2eTempParent, 'run-'))
const e2eAdminPassword = 'ai-forum-local-admin'
const e2eAdminSalt = Buffer.from('ai-forum-e2e-salt')
const e2eAdminPasswordHash = `scrypt$${e2eAdminSalt.toString('base64url')}$${scryptSync(e2eAdminPassword, e2eAdminSalt, 64).toString('base64url')}`

const serverEnvironment = {
  ...process.env,
  HOST: host,
  PORT: port,
  NODE_ENV: 'test',
  DATABASE_PATH: join(e2eDataRoot, 'forum.db'),
  UPLOAD_DIR: join(e2eDataRoot, 'uploads'),
  SEED_DEMO_CONTENT: 'true',
  ADMIN_PASSWORD_HASH: e2eAdminPasswordHash,
  E2E_INSECURE_ADMIN_COOKIE: 'true',
  VIEW_HASH_SECRET: 'e2e-view-secret',
  UPLOAD_CLEANUP_GRACE_HOURS: '0',
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
  child.kill('SIGTERM')
  const exited = await Promise.race([
    waitForExit(child).then(() => true),
    new Promise(resolveWait => setTimeout(() => resolveWait(false), 3_000)),
  ])
  if (!exited && process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    await new Promise(resolveWait => setTimeout(resolveWait, 250))
  }
  else if (!exited) {
    child.kill('SIGKILL')
    await new Promise(resolveWait => setTimeout(resolveWait, 250))
  }
}

function cleanupE2eData(root) {
  const relativePath = relative(e2eTempParent, resolve(root))
  if (!relativePath.startsWith('run-') || relativePath.includes(sep)) {
    throw new Error(`拒绝清理非测试临时目录：${root}`)
  }
  rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
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
  try {
    cleanupE2eData(e2eDataRoot)
  }
  catch (error) {
    console.warn('测试临时目录清理失败，可在系统临时目录中稍后清理。', error)
  }
}

process.exit(exitCode)
