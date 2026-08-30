import { createHash } from 'node:crypto'
import { ZodError } from 'zod'
import {
  createError,
  getCookie,
  getHeader,
  getRequestIP,
  type H3Event,
} from 'h3'
import { validateAdminSession } from './auth'
import { getForumDatabase } from './forum'
import { resolveClientAddress } from './security'

export const ADMIN_SESSION_COOKIE = 'ai_forum_admin'

const BAD_REQUEST_MESSAGES = new Set([
  '标题不能为空',
  '正文不能为空',
  '板块不存在',
  '主题不存在',
  '工具链接必须是有效的 HTTP 或 HTTPS 地址',
  '板块名称已被使用',
  '网址标识已被使用',
  '板块中还有帖子，请先移动或删除这些帖子',
  '至少保留一个板块',
  '标签不存在',
  '标签名称不能为空',
  '标签名称已被使用',
])

export function requireAdmin(event: H3Event): string {
  const token = getCookie(event, ADMIN_SESSION_COOKIE)
  if (!validateAdminSession(getForumDatabase(), token)) {
    throw createError({ statusCode: 401, message: '管理会话已过期，请重新登录' })
  }
  return token as string
}

export function numericRouteId(value: string | undefined, entity = '主题'): number {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) {
    throw createError({ statusCode: 404, message: `${entity}不存在` })
  }
  return id
}

export function visitorFingerprint(event: H3Event): string {
  const ip = clientAddress(event)
  const agent = getHeader(event, 'user-agent') || 'unknown'
  const secret = process.env.VIEW_HASH_SECRET || 'local-development-view-secret'
  return createHash('sha256').update(`${secret}:${ip}:${agent}`).digest('hex')
}

export function clientAddress(event: H3Event): string {
  return resolveClientAddress({
    trustProxy: process.env.TRUST_PROXY === 'true',
    socketAddress: getRequestIP(event),
    cfConnectingIp: getHeader(event, 'cf-connecting-ip'),
    forwardedFor: getHeader(event, 'x-forwarded-for'),
  })
}

export function requestError(error: unknown): never {
  if (error instanceof ZodError) {
    throw createError({ statusCode: 400, message: error.issues[0]?.message || '提交内容不完整' })
  }
  if (error && typeof error === 'object' && 'statusCode' in error) throw error
  if (error instanceof Error && BAD_REQUEST_MESSAGES.has(error.message)) {
    throw createError({ statusCode: 400, message: error.message })
  }

  console.error(error)
  throw createError({ statusCode: 500, message: '服务器暂时无法处理这个请求' })
}
