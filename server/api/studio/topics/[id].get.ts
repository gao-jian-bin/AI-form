import { createError, getRouterParam } from 'h3'
import { getStudioTopic } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { numericRouteId, requireAdmin } from '../../../utils/http'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const topic = getStudioTopic(getForumDatabase(), numericRouteId(getRouterParam(event, 'id')))
  if (!topic) throw createError({ statusCode: 404, statusMessage: '主题不存在' })
  return topic
})
