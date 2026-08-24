import { getRouterParam, readBody } from 'h3'
import { updateCategory } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { numericRouteId, requestError, requireAdmin } from '../../../utils/http'
import { parseCategoryPayload } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  try {
    return updateCategory(
      getForumDatabase(),
      numericRouteId(getRouterParam(event, 'id'), '板块'),
      parseCategoryPayload(await readBody(event), 'update'),
    )
  } catch (error) {
    return requestError(error)
  }
})
