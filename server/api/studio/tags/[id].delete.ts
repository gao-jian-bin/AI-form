import { createError, getRouterParam } from 'h3'
import { deleteTag } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { numericRouteId, requestError, requireAdmin } from '../../../utils/http'

export default defineEventHandler((event) => {
  requireAdmin(event)
  try {
    const deleted = deleteTag(
      getForumDatabase(),
      numericRouteId(getRouterParam(event, 'id'), '标签'),
    )
    if (!deleted) throw createError({ statusCode: 404, message: '标签不存在' })
    return { ok: true }
  } catch (error) {
    return requestError(error)
  }
})
