import { createError, getRouterParam, readBody } from 'h3'
import { getStudioTag, updateTag } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { numericRouteId, requestError, requireAdmin } from '../../../utils/http'
import { parseTagPayload } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  try {
    const id = numericRouteId(getRouterParam(event, 'id'), '标签')
    const input = parseTagPayload(await readBody(event))
    const db = getForumDatabase()
    if (!getStudioTag(db, id)) {
      throw createError({ statusCode: 404, message: '标签不存在' })
    }
    return updateTag(db, id, input)
  } catch (error) {
    return requestError(error)
  }
})
