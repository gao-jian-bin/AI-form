import { createError, getRouterParam } from 'h3'
import { deleteTopic } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { numericRouteId, requireAdmin } from '../../../utils/http'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const deleted = deleteTopic(getForumDatabase(), numericRouteId(getRouterParam(event, 'id')))
  if (!deleted) throw createError({ statusCode: 404, statusMessage: '主题不存在' })
  return { ok: true }
})
