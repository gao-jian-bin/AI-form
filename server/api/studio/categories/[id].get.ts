import { createError, getRouterParam } from 'h3'
import { getStudioCategory } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { numericRouteId, requireAdmin } from '../../../utils/http'

export default defineEventHandler((event) => {
  requireAdmin(event)
  const category = getStudioCategory(
    getForumDatabase(),
    numericRouteId(getRouterParam(event, 'id'), '板块'),
  )
  if (!category) throw createError({ statusCode: 404, message: '板块不存在' })
  return category
})
