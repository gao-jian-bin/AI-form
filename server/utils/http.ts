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

export const ADMIN_SESSION_COOKIE = 'ai_forum_admin'

export function requireAdmin(event: H3Event): string {
  const token = getCookie(event, ADMIN_SESSION_COOKIE)
  if (!validateAdminSession(getForumDatabase(), token)) {
    throw createError({ statusCode: 401, statusMessage: '管理会话已过期，请重新登录' })
  }
  return token as string
}

export function numericRouteId(value: string | undefined): number {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: '主题不存在' })
  }
  return id
}

export function visitorFingerprint(event: H3Event): string {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const agent = getHeader(event, 'user-agent') || 'unknown'
  const secret = process.env.VIEW_HASH_SECRET || 'local-development-view-secret'
  return createHash('sha256').update(`${secret}:${ip}:${agent}`).digest('hex')
}

export function requestError(error: unknown): never {
  if (error instanceof ZodError) {
    throw createError({ statusCode: 400, statusMessage: error.issues[0]?.message || '提交内容不完整' })
  }
  if (error && typeof error === 'object' && 'statusCode' in error) throw error
  if (error instanceof Error && [
    '标题不能为空', '正文不能为空', '板块不存在', '主题不存在',
    '请选择 ChatGPT 或工具箱板块', '工具链接必须是有效的 HTTP 或 HTTPS 地址',
    '只有工具箱主题可以设置工具链接',
  ].includes(error.message)) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  console.error(error)
  throw createError({ statusCode: 500, statusMessage: '服务器暂时无法处理这个请求' })
}
