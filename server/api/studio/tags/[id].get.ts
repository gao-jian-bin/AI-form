import { createError, getRouterParam } from 'h3'
import { getStudioTag } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { numericRouteId, requireAdmin } from '../../../utils/http'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const tag = getStudioTag(
    getForumDatabase(),
    numericRouteId(getRouterParam(event, 'id'), '标签'),
  )
  if (!tag) throw createError({ statusCode: 404, message: '标签不存在' })
  return tag
})
