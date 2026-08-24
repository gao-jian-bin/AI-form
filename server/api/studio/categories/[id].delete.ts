import { createError, getRouterParam } from 'h3'
import { deleteCategory } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { numericRouteId, requestError, requireAdmin } from '../../../utils/http'

export default defineEventHandler((event) => {
  requireAdmin(event)
  try {
    const deleted = deleteCategory(
      getForumDatabase(),
      numericRouteId(getRouterParam(event, 'id'), '板块'),
    )
    if (!deleted) throw createError({ statusCode: 404, statusMessage: '板块不存在' })
    return { ok: true }
  } catch (error) {
    return requestError(error)
  }
})
