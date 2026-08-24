import { createError, getRequestIP, readBody, setCookie } from 'h3'
import { LoginAttemptLimiter, createAdminSession, hashPassword, verifyPassword } from '../../utils/auth'
import { getForumDatabase } from '../../utils/forum'
import { ADMIN_SESSION_COOKIE } from '../../utils/http'

const limiter = new LoginAttemptLimiter({ maxAttempts: 5, windowMs: 15 * 60_000 })

function configuredPasswordHash(): string {
  if (process.env.ADMIN_PASSWORD_HASH) return process.env.ADMIN_PASSWORD_HASH
  if (process.env.ADMIN_PASSWORD) {
    return hashPassword(process.env.ADMIN_PASSWORD, Buffer.from('ai-forum-env-salt'))
  }
  if (process.env.NODE_ENV !== 'production') {
    return hashPassword('ai-forum-local-admin', Buffer.from('ai-forum-dev-salt'))
  }
  throw createError({ statusCode: 503, statusMessage: '管理员密码尚未配置' })
}

export default defineEventHandler(async (event) => {
  const address = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!limiter.canAttempt(address)) {
    throw createError({ statusCode: 429, statusMessage: '尝试次数过多，请 15 分钟后再试' })
  }

  const body = await readBody<{ password?: string }>(event)
  if (!body?.password || !verifyPassword(body.password, configuredPasswordHash())) {
    limiter.recordFailure(address)
    throw createError({ statusCode: 401, statusMessage: '密码不正确' })
  }

  limiter.reset(address)
  const session = createAdminSession(getForumDatabase())
  setCookie(event, ADMIN_SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production' && process.env.E2E_INSECURE_ADMIN_COOKIE !== 'true',
    path: '/',
    expires: session.expiresAt,
  })

  return { ok: true }
})
